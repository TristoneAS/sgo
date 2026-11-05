"use client";

import { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildSerieRenglon } from "@/libs/formato_chart";

const COLOR_V1 = "#2563eb";
const COLOR_V2 = "#dc2626";
const COLOR_SIMPLE = "#0f766e";
const COLOR_OBJETIVO = "#ca8a04";
const COLOR_TENDENCIA = "#7c3aed";

function chartDataFromSerie(serie) {
  const objetivo =
    typeof serie.meta?.objetivoValor === "number"
      ? serie.meta.objetivoValor
      : null;
  const tieneTendencia = serie.points.some(
    (p) => typeof p.tendencia === "number",
  );

  return serie.points.map((p) => ({
    name: p.label,
    ...(serie.dual
      ? {
          [serie.etiqueta1]: p.v1,
          [serie.etiqueta2]: p.v2,
        }
      : { Valor: p.valor }),
    ...(objetivo != null ? { Objetivo: objetivo } : {}),
    ...(tieneTendencia ? { Tendencia: p.tendencia } : {}),
  }));
}

function MetaLegend({ meta = {} }) {
  const items = [
    { label: "Métrico", value: meta.metrico },
    { label: "Objetivo", value: meta.objetivo },
    { label: "Responsable", value: meta.responsable },
  ].filter((item) => item.value);

  if (!items.length) return null;

  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        mb: 1,
        display: "grid",
        gap: 0.35,
        px: 1,
        py: 0.75,
        borderRadius: 1,
        bgcolor: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            display: "grid",
            gridTemplateColumns: "88px 1fr",
            gap: 0.75,
            alignItems: "baseline",
          }}
        >
          <Typography
            component="dt"
            sx={{
              m: 0,
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            {item.label}
          </Typography>
          <Typography
            component="dd"
            sx={{
              m: 0,
              fontSize: 13,
              fontWeight: item.label === "Métrico" ? 700 : 500,
              color: "#1e293b",
              wordBreak: "break-word",
            }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function RenglonChart({ serie }) {
  const data = useMemo(() => chartDataFromSerie(serie), [serie]);
  const objetivoValor =
    typeof serie.meta?.objetivoValor === "number"
      ? serie.meta.objetivoValor
      : null;
  const tieneTendencia = data.some((p) => typeof p.Tendencia === "number");

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: "#bfdbfe",
        borderRadius: 2,
        bgcolor: "#fff",
      }}
    >
      <CardContent sx={{ pb: "12px !important" }}>
        <MetaLegend meta={serie.meta} />
        {!serie.meta?.metrico ? (
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: "#1e3a5f", mb: 1 }}
          >
            {serie.title}
          </Typography>
        ) : null}
        <Box sx={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#475569" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "#475569" }} width={48} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  borderColor: "#cbd5e1",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {objetivoValor != null ? (
                <ReferenceLine
                  y={objetivoValor}
                  stroke={COLOR_OBJETIVO}
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                  label={{
                    value: `Obj. ${objetivoValor}`,
                    position: "insideTopRight",
                    fill: COLOR_OBJETIVO,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              ) : null}
              {serie.dual ? (
                <>
                  <Line
                    type="monotone"
                    dataKey={serie.etiqueta1}
                    stroke={COLOR_V1}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={serie.etiqueta2}
                    stroke={COLOR_V2}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="Valor"
                  stroke={COLOR_SIMPLE}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              )}
              {objetivoValor != null ? (
                <Line
                  type="monotone"
                  dataKey="Objetivo"
                  stroke={COLOR_OBJETIVO}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={false}
                  legendType="plainline"
                />
              ) : null}
              {tieneTendencia ? (
                <Line
                  type="linear"
                  dataKey="Tendencia"
                  stroke={COLOR_TENDENCIA}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  legendType="plainline"
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function FormatosGraficas({ formato, filas = [] }) {
  const series = useMemo(() => {
    const columnas = formato?.columnas || [];
    return filas.map((fila, index) => buildSerieRenglon(fila, columnas, index));
  }, [formato, filas]);

  if (!series.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No hay renglones para graficar con el filtro actual.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: {
          xs: "1fr",
          md: "1fr 1fr",
        },
        alignContent: "start",
        pr: 0.5,
      }}
    >
      {series.map((serie) => (
        <RenglonChart key={serie.id || serie.title} serie={serie} />
      ))}
    </Box>
  );
}
