"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TableChartIcon from "@mui/icons-material/TableChart";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import FormatosGraficas from "@/app/components/FormatosGraficas";
import { getEstiloCelda, getEstiloCeldaDoble } from "@/libs/conditional_rules";
import {
  etiquetasDoble,
  isValorDoble,
  parseColumnasDobles,
  parseDobleValor,
  valorEscalar,
} from "@/libs/doble_valor";
import { getColumnWidth, getTableMinWidth } from "@/libs/excel_column_styles";
import { exportFormatoToExcel } from "@/libs/export_formato_excel";
import { anioActual, buildAnioOptions } from "@/libs/formato_anio";
import { formatoSoportaGraficas } from "@/libs/formato_chart";
import { valorCeldaConYtd } from "@/libs/ytd_promedio";

const BORDER = "2px solid #64748b";
const VACIO = "(Vacío)";

const headerCellSx = (horizontal, width, expandirTabla) => ({
  position: "sticky",
  top: 0,
  zIndex: 2,
  border: BORDER,
  background: "linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)",
  color: "#1e3a5f",
  fontWeight: 600,
  fontSize: 11,
  lineHeight: 1.25,
  verticalAlign: "bottom",
  p: 0,
  ...(expandirTabla ? { minWidth: width } : { width, minWidth: width }),
});

const bodyCellSx = (width, expandirTabla, extra = {}) => ({
  border: BORDER,
  p: 0,
  verticalAlign: "top",
  backgroundColor: "#fff",
  ...(expandirTabla
    ? { minWidth: width }
    : { width, minWidth: width, maxWidth: width }),
  ...extra,
});

const rowHeaderSx = {
  position: "sticky",
  left: 0,
  zIndex: 3,
  width: 36,
  minWidth: 36,
  border: BORDER,
  boxShadow: "2px 0 0 #64748b",
  backgroundColor: "#f1f5f9",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 600,
  textAlign: "center",
  px: 0.5,
  py: 0.5,
};

function textoFiltroCelda(col, fila) {
  const raw = valorCeldaConYtd(col, fila.celdas || {});
  const dobles = new Set(parseColumnasDobles(fila.columnas_dobles));
  const esDoble =
    (typeof raw === "object" && raw != null) ||
    dobles.has(Number(col.id_columna)) ||
    isValorDoble(raw);

  if (esDoble) {
    const doble = parseDobleValor(raw);
    const labels = etiquetasDoble(fila);
    const v1 = String(doble.v1 ?? "").trim();
    const v2 = String(doble.v2 ?? "").trim();
    if (!v1 && !v2) return VACIO;
    return `${labels.etiqueta1}: ${v1 || "—"} | ${labels.etiqueta2}: ${v2 || "—"}`;
  }

  const valor = String(valorEscalar(raw) ?? "").trim();
  return valor || VACIO;
}

function setsIguales(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

export default function FormatosExcelTable() {
  const [formatos, setFormatos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [anio, setAnio] = useState(() => anioActual());
  const [formato, setFormato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [titulosHorizontales, setTitulosHorizontales] = useState(false);
  const [expandirTabla, setExpandirTabla] = useState(false);
  const [vista, setVista] = useState("tabla");
  const [columnFilters, setColumnFilters] = useState({});
  const [filterMenu, setFilterMenu] = useState(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDraft, setFilterDraft] = useState(null);

  const loadFormatos = useCallback(async () => {
    const [resFormatos, resCategorias] = await Promise.all([
      fetch("/api/formatos"),
      fetch("/api/categorias"),
    ]);
    const dataFormatos = await resFormatos.json();
    const dataCategorias = await resCategorias.json();
    setFormatos(dataFormatos.success ? dataFormatos.data : []);
    setCategorias(dataCategorias.success ? dataCategorias.data : []);
  }, []);

  const loadFormato = useCallback(async (id, anioConsulta = anio) => {
    if (!id) {
      setFormato(null);
      return;
    }

    setLoading(true);
    const res = await fetch(
      `/api/formatos/${id}?anio=${encodeURIComponent(anioConsulta)}`,
    );
    const data = await res.json();

    if (data.success) {
      setFormato(data.data);
      setColumnFilters({});
      setFilterMenu(null);
      setFilterDraft(null);
      setFilterSearch("");
      if (!formatoSoportaGraficas(data.data?.columnas || [])) {
        setVista("tabla");
      }
    } else {
      setFormato(null);
      setMessage({
        text: data.error || "No se pudo cargar el formato",
        type: "error",
      });
    }
    setLoading(false);
  }, [anio]);

  useEffect(() => {
    loadFormatos().finally(() => setLoading(false));
  }, [loadFormatos]);

  useEffect(() => {
    if (selectedId) loadFormato(selectedId, anio);
  }, [selectedId, anio, loadFormato]);

  const formatosFiltrados = useMemo(() => {
    if (!filtroCategoria) return formatos;
    if (filtroCategoria === "sin") {
      return formatos.filter((f) => !f.id_categoria);
    }
    const id = Number(filtroCategoria);
    return formatos.filter((f) => Number(f.id_categoria) === id);
  }, [formatos, filtroCategoria]);

  useEffect(() => {
    if (
      selectedId &&
      !formatosFiltrados.some((f) => String(f.id_formato) === String(selectedId))
    ) {
      setSelectedId("");
      setFormato(null);
      setColumnFilters({});
    }
  }, [formatosFiltrados, selectedId]);

  const anioOptions = useMemo(
    () => buildAnioOptions(formato?.anios_disponibles || [], anio),
    [formato?.anios_disponibles, anio],
  );

  const columnas = formato?.columnas || [];
  const filas = formato?.filas || [];
  const puedeGraficar = formatoSoportaGraficas(columnas);
  const widthOpts = { horizontal: titulosHorizontales };
  const tableMinWidth = columnas.length
    ? getTableMinWidth(columnas, widthOpts)
    : 1100;

  const filasFiltradas = useMemo(() => {
    const active = Object.entries(columnFilters).filter(
      ([, selected]) => selected instanceof Set,
    );
    if (!active.length) return filas;

    return filas.filter((fila) =>
      active.every(([colId, selected]) => {
        const col = columnas.find((c) => String(c.id_columna) === String(colId));
        if (!col) return true;
        return selected.has(textoFiltroCelda(col, fila));
      }),
    );
  }, [filas, columnas, columnFilters]);

  const valoresUnicosMenu = useMemo(() => {
    if (!filterMenu) return [];
    const col = columnas.find(
      (c) => String(c.id_columna) === String(filterMenu.colId),
    );
    if (!col) return [];

    const otherFilters = Object.entries(columnFilters).filter(
      ([colId, selected]) =>
        selected instanceof Set && String(colId) !== String(filterMenu.colId),
    );

    const baseRows =
      otherFilters.length === 0
        ? filas
        : filas.filter((fila) =>
            otherFilters.every(([colId, selected]) => {
              const other = columnas.find(
                (c) => String(c.id_columna) === String(colId),
              );
              if (!other) return true;
              return selected.has(textoFiltroCelda(other, fila));
            }),
          );

    const set = new Set();
    for (const fila of baseRows) {
      set.add(textoFiltroCelda(col, fila));
    }
    return Array.from(set).sort((a, b) => {
      if (a === VACIO) return 1;
      if (b === VACIO) return -1;
      return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
    });
  }, [filterMenu, columnas, filas, columnFilters]);

  const valoresMenuVisibles = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return valoresUnicosMenu;
    return valoresUnicosMenu.filter((v) => v.toLowerCase().includes(q));
  }, [valoresUnicosMenu, filterSearch]);

  const hayFiltrosActivos = Object.values(columnFilters).some(
    (s) => s instanceof Set,
  );

  function openFilterMenu(event, colId) {
    event.stopPropagation();
    const key = String(colId);
    const existing = columnFilters[key];
    const col = columnas.find((c) => String(c.id_columna) === key);
    if (!col) return;

    const otherFilters = Object.entries(columnFilters).filter(
      ([id, selected]) => selected instanceof Set && id !== key,
    );
    const baseRows =
      otherFilters.length === 0
        ? filas
        : filas.filter((fila) =>
            otherFilters.every(([id, selected]) => {
              const other = columnas.find(
                (c) => String(c.id_columna) === String(id),
              );
              if (!other) return true;
              return selected.has(textoFiltroCelda(other, fila));
            }),
          );

    const all = new Set();
    for (const fila of baseRows) {
      all.add(textoFiltroCelda(col, fila));
    }

    setFilterDraft(existing instanceof Set ? new Set(existing) : new Set(all));
    setFilterSearch("");
    setFilterMenu({
      anchorEl: event.currentTarget,
      colId: key,
    });
  }

  function closeFilterMenu() {
    setFilterMenu(null);
    setFilterDraft(null);
    setFilterSearch("");
  }

  function applyFilterMenu() {
    if (!filterMenu || !(filterDraft instanceof Set)) {
      closeFilterMenu();
      return;
    }

    const all = new Set(valoresUnicosMenu);
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (filterDraft.size === 0 || setsIguales(filterDraft, all)) {
        delete next[filterMenu.colId];
      } else {
        next[filterMenu.colId] = new Set(filterDraft);
      }
      return next;
    });
    closeFilterMenu();
  }

  function clearAllFilters() {
    setColumnFilters({});
    closeFilterMenu();
  }

  function toggleDraftValue(value) {
    setFilterDraft((prev) => {
      const next = new Set(prev || []);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function selectAllDraft(checked) {
    if (checked) {
      setFilterDraft(new Set(valoresUnicosMenu));
    } else {
      setFilterDraft(new Set());
    }
  }

  const allDraftSelected =
    filterDraft instanceof Set &&
    valoresUnicosMenu.length > 0 &&
    setsIguales(filterDraft, new Set(valoresUnicosMenu));

  const someDraftSelected =
    filterDraft instanceof Set &&
    filterDraft.size > 0 &&
    !allDraftSelected;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        gap: 1,
      }}
    >
      {message.text ? (
        <Alert
          severity={message.type === "error" ? "error" : "success"}
          sx={{ py: 0.5 }}
        >
          {message.text}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            displayEmpty
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <MenuItem value="">Todas las categorías</MenuItem>
            <MenuItem value="sin">Sin categoría</MenuItem>
            {categorias.map((cat) => (
              <MenuItem key={cat.id_categoria} value={String(cat.id_categoria)}>
                {cat.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <Select
            displayEmpty
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <MenuItem value="">
              <em>Selecciona un formato...</em>
            </MenuItem>
            {formatosFiltrados.map((f) => (
              <MenuItem key={f.id_formato} value={f.id_formato}>
                {f.categoria_nombre
                  ? `${f.nombre} · ${f.categoria_nombre}`
                  : f.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            aria-label="Año"
          >
            {anioOptions.map((y) => (
              <MenuItem key={y} value={y}>
                Año {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {puedeGraficar ? (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={vista}
            onChange={(_e, next) => {
              if (next) setVista(next);
            }}
            aria-label="Vista tabla o gráficas"
          >
            <ToggleButton value="tabla" sx={{ px: 1.25, textTransform: "none" }}>
              <TableChartIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Tabla
            </ToggleButton>
            <ToggleButton
              value="graficas"
              sx={{ px: 1.25, textTransform: "none" }}
            >
              <ShowChartIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Gráficas
            </ToggleButton>
          </ToggleButtonGroup>
        ) : null}

        {vista === "tabla" ? (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={titulosHorizontales}
                  onChange={(e) => setTitulosHorizontales(e.target.checked)}
                />
              }
              label={
                titulosHorizontales
                  ? "Títulos horizontales"
                  : "Títulos verticales"
              }
              sx={{
                m: 0,
                px: 1,
                py: 0.25,
                border: "1px solid #bfdbfe",
                borderRadius: 1,
                bgcolor: "#eff6ff",
                "& .MuiFormControlLabel-label": {
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1e3a5f",
                },
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={expandirTabla}
                  onChange={(e) => setExpandirTabla(e.target.checked)}
                />
              }
              label={expandirTabla ? "Tabla expandida" : "Expandir tabla"}
              sx={{
                m: 0,
                px: 1,
                py: 0.25,
                border: "1px solid #bfdbfe",
                borderRadius: 1,
                bgcolor: "#eff6ff",
                "& .MuiFormControlLabel-label": {
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1e3a5f",
                },
              }}
            />
          </>
        ) : null}

        {hayFiltrosActivos ? (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<FilterAltOffIcon />}
            onClick={clearAllFilters}
          >
            Limpiar filtros
            {filas.length
              ? ` (${filasFiltradas.length}/${filas.length})`
              : ""}
          </Button>
        ) : null}

        <Button
          size="small"
          variant="contained"
          startIcon={<FileDownloadIcon />}
          disabled={!formato || !filasFiltradas.length}
          onClick={() => {
            try {
              exportFormatoToExcel({
                nombre: `${formato?.nombre || "formato"}_${anio}`,
                columnas,
                filas: filasFiltradas,
              });
            } catch (err) {
              setMessage({
                text: err?.message || "No se pudo exportar a Excel",
                type: "error",
              });
            }
          }}
        >
          Exportar Excel
        </Button>

        <Button
          component={Link}
          href="/dashboard/llenar-formatos"
          size="small"
          variant="outlined"
        >
          Ir a llenar formatos
        </Button>
      </Box>

      {loading && selectedId ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          Cargando formato...
        </Typography>
      ) : !selectedId ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          Selecciona un formato para visualizar sus respuestas en tabla.
        </Typography>
      ) : !formato ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          Formato no encontrado.
        </Typography>
      ) : !filas.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          Este formato aún no tiene respuestas para {anio}.{" "}
          <Button
            component={Link}
            href="/dashboard/llenar-formatos"
            size="small"
          >
            Llénalo aquí
          </Button>
        </Typography>
      ) : vista === "graficas" && puedeGraficar ? (
        <FormatosGraficas formato={formato} filas={filasFiltradas} />
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            flex: 1,
            width: "100%",
            minHeight: 0,
            maxHeight: "calc(100vh - 200px)",
            overflow: "auto",
            border: BORDER,
            borderRadius: 2,
          }}
        >
          <Table
            stickyHeader
            size="small"
            sx={{
              minWidth: tableMinWidth,
              width: expandirTabla ? "100%" : "max-content",
              tableLayout: expandirTabla ? "auto" : "fixed",
              borderCollapse: "collapse",
              "& .MuiTableCell-root": {
                border: BORDER,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    ...rowHeaderSx,
                    top: 0,
                    zIndex: 4,
                  }}
                >
                  #
                </TableCell>
                {columnas.map((col) => {
                  const width = getColumnWidth(col.titulo, widthOpts);
                  const colKey = String(col.id_columna);
                  const filtroActivo = columnFilters[colKey] instanceof Set;
                  return (
                    <TableCell
                      key={col.id_columna}
                      title={col.titulo}
                      sx={headerCellSx(
                        titulosHorizontales,
                        width,
                        expandirTabla,
                      )}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: titulosHorizontales
                            ? "row"
                            : "column",
                          alignItems: "stretch",
                          justifyContent: "space-between",
                          height: titulosHorizontales ? "auto" : 200,
                          minHeight: titulosHorizontales ? 44 : 200,
                        }}
                      >
                        <Box
                          sx={{
                            flex: 1,
                            display: "flex",
                            alignItems: titulosHorizontales
                              ? "center"
                              : "flex-end",
                            justifyContent: "center",
                            px: titulosHorizontales ? 1.25 : 0.75,
                            py: titulosHorizontales ? 1 : 1.25,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            ...(titulosHorizontales
                              ? {
                                  writingMode: "horizontal-tb",
                                  transform: "none",
                                }
                              : {
                                  writingMode: "vertical-rl",
                                  transform: "rotate(180deg)",
                                }),
                          }}
                        >
                          {col.titulo}
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            borderTop: titulosHorizontales
                              ? "none"
                              : "1px solid #93c5fd",
                            borderLeft: titulosHorizontales
                              ? "1px solid #93c5fd"
                              : "none",
                            bgcolor: filtroActivo ? "#fef3c7" : "transparent",
                            flexShrink: 0,
                          }}
                        >
                          <IconButton
                            size="small"
                            aria-label={`Filtrar ${col.titulo}`}
                            onClick={(e) => openFilterMenu(e, col.id_columna)}
                            sx={{
                              p: 0.35,
                              color: filtroActivo ? "#b45309" : "#1e3a5f",
                            }}
                          >
                            <FilterAltIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {!filasFiltradas.length ? (
                <TableRow>
                  <TableCell
                    colSpan={columnas.length + 1}
                    sx={{ py: 3, textAlign: "center", color: "#64748b" }}
                  >
                    Ninguna fila coincide con los filtros.{" "}
                    <Button size="small" onClick={clearAllFilters}>
                      Limpiar filtros
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filasFiltradas.map((fila, index) => (
                  <TableRow key={fila.id_fila} hover>
                    <TableCell sx={rowHeaderSx}>{index + 1}</TableCell>
                    {columnas.map((col) => {
                      const width = getColumnWidth(col.titulo, widthOpts);
                      const raw = valorCeldaConYtd(col, fila.celdas || {});
                      const labels = etiquetasDoble(fila);
                      const dobles = new Set(
                        parseColumnasDobles(fila.columnas_dobles),
                      );
                      const esDoble =
                        (typeof raw === "object" && raw != null) ||
                        dobles.has(Number(col.id_columna)) ||
                        isValorDoble(raw);

                      if (esDoble) {
                        const doble = parseDobleValor(raw);
                        const reglasFila =
                          fila.reglas_dobles?.[Number(col.id_columna)] || [];
                        const style1 = getEstiloCeldaDoble(
                          "v1",
                          doble,
                          col.reglas,
                          fila.celdas || {},
                          reglasFila,
                        );
                        const style2 = getEstiloCeldaDoble(
                          "v2",
                          doble,
                          col.reglas,
                          fila.celdas || {},
                          reglasFila,
                        );
                        return (
                          <TableCell
                            key={col.id_columna}
                            sx={bodyCellSx(width, expandirTabla)}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                minHeight: "100%",
                              }}
                            >
                              <Box
                                sx={{
                                  flex: 1,
                                  px: 0.75,
                                  py: 0.5,
                                  fontSize: 12,
                                  lineHeight: 1.3,
                                  borderBottom: BORDER,
                                  wordBreak: "break-word",
                                  ...style1,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    mr: 0.5,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {labels.etiqueta1}
                                </Box>
                                {doble.v1 || "—"}
                              </Box>
                              <Box
                                sx={{
                                  flex: 1,
                                  px: 0.75,
                                  py: 0.5,
                                  fontSize: 12,
                                  lineHeight: 1.3,
                                  wordBreak: "break-word",
                                  ...style2,
                                }}
                              >
                                <Box
                                  component="span"
                                  sx={{
                                    mr: 0.5,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {labels.etiqueta2}
                                </Box>
                                {doble.v2 || "—"}
                              </Box>
                            </Box>
                          </TableCell>
                        );
                      }

                      const valor = valorEscalar(raw);
                      const reglaStyle = getEstiloCelda(
                        valor,
                        col.reglas,
                        fila.celdas || {},
                        fila.reglas_fila?.[Number(col.id_columna)] || [],
                      );
                      return (
                        <TableCell
                          key={col.id_columna}
                          sx={bodyCellSx(width, expandirTabla, reglaStyle || {})}
                        >
                          <Box
                            sx={{
                              minHeight: 36,
                              px: 1,
                              py: 0.75,
                              fontSize: 12,
                              lineHeight: 1.3,
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                              color: reglaStyle?.color || "#1e293b",
                              background: "transparent",
                            }}
                          >
                            {valor || "—"}
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu
        anchorEl={filterMenu?.anchorEl || null}
        open={Boolean(filterMenu?.anchorEl)}
        onClose={closeFilterMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: { width: 280, maxHeight: 420 },
          },
        }}
      >
        <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#334155" }}>
            Filtrar columna
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar valor..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            sx={{ mt: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <FilterAltIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        <Divider />
        <MenuItem dense onClick={() => selectAllDraft(!allDraftSelected)}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Checkbox
              size="small"
              edge="start"
              checked={allDraftSelected}
              indeterminate={someDraftSelected}
              tabIndex={-1}
              disableRipple
            />
          </ListItemIcon>
          <ListItemText
            primary="Seleccionar todo"
            slotProps={{
              primary: { sx: { fontSize: 13, fontWeight: 600 } },
            }}
          />
        </MenuItem>
        <Divider />
        <Box sx={{ maxHeight: 240, overflow: "auto" }}>
          {valoresMenuVisibles.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, py: 1.5 }}
            >
              Sin valores
            </Typography>
          ) : (
            valoresMenuVisibles.map((value) => (
              <MenuItem
                key={value}
                dense
                onClick={() => toggleDraftValue(value)}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    size="small"
                    edge="start"
                    checked={filterDraft?.has(value) || false}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText
                  primary={value}
                  slotProps={{
                    primary: {
                      sx: { fontSize: 13 },
                      noWrap: true,
                      title: value,
                    },
                  }}
                />
              </MenuItem>
            ))
          )}
        </Box>
        <Divider />
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            px: 1.5,
            py: 1,
          }}
        >
          <Button size="small" onClick={closeFilterMenu}>
            Cancelar
          </Button>
          <Button size="small" variant="contained" onClick={applyFilterMenu}>
            Aceptar
          </Button>
        </Box>
      </Menu>
    </Box>
  );
}
