"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getEstiloCelda, getEstiloCeldaDoble } from "@/libs/conditional_rules";
import {
  etiquetasDoble,
  isValorDoble,
  parseColumnasDobles,
  parseDobleValor,
  valorEscalar,
} from "@/libs/doble_valor";
import { getColumnWidth, getTableMinWidth } from "@/libs/excel_column_styles";
import { valorCeldaConYtd } from "@/libs/ytd_promedio";

const BORDER = "2px solid #64748b";

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
  verticalAlign: horizontal ? "middle" : "bottom",
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  ...(horizontal
    ? {
        writingMode: "horizontal-tb",
        transform: "none",
        height: "auto",
        minHeight: 44,
        px: 1.25,
        py: 1,
      }
    : {
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        height: 200,
        minHeight: 200,
        px: 0.75,
        py: 1.25,
      }),
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

export default function FormatosExcelTable() {
  const [formatos, setFormatos] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [formato, setFormato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [titulosHorizontales, setTitulosHorizontales] = useState(false);
  const [expandirTabla, setExpandirTabla] = useState(false);

  const loadFormatos = useCallback(async () => {
    const res = await fetch("/api/formatos");
    const data = await res.json();
    setFormatos(data.success ? data.data : []);
  }, []);

  const loadFormato = useCallback(async (id) => {
    if (!id) {
      setFormato(null);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/formatos/${id}`);
    const data = await res.json();

    if (data.success) {
      setFormato(data.data);
    } else {
      setFormato(null);
      setMessage({
        text: data.error || "No se pudo cargar el formato",
        type: "error",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFormatos().finally(() => setLoading(false));
  }, [loadFormatos]);

  useEffect(() => {
    if (selectedId) loadFormato(selectedId);
  }, [selectedId, loadFormato]);

  const columnas = formato?.columnas || [];
  const filas = formato?.filas || [];
  const widthOpts = { horizontal: titulosHorizontales };
  const tableMinWidth = columnas.length
    ? getTableMinWidth(columnas, widthOpts)
    : 1100;

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
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <Select
            displayEmpty
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <MenuItem value="">
              <em>Selecciona un formato...</em>
            </MenuItem>
            {formatos.map((f) => (
              <MenuItem key={f.id_formato} value={f.id_formato}>
                {f.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={titulosHorizontales}
              onChange={(e) => setTitulosHorizontales(e.target.checked)}
            />
          }
          label={
            titulosHorizontales ? "Títulos horizontales" : "Títulos verticales"
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
          Este formato aún no tiene respuestas.{" "}
          <Button
            component={Link}
            href="/dashboard/llenar-formatos"
            size="small"
          >
            Llénalo aquí
          </Button>
        </Typography>
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
                      {col.titulo}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map((fila, index) => (
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
