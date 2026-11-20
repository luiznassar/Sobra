"use client";

import { useState } from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RegistroDiario = {
  data: string;
  prejuizo: number;
};

type Props = {
  dados: RegistroDiario[];
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  return new Date(`${data}T12:00:00`).toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
    }
  );
}

export default function GraficoDesperdicio({
  dados,
}: Props) {
    const [periodo, setPeriodo] = useState<7 | 30>(30);

    const dadosFiltrados = dados.slice(-periodo);
  
    const totalPeriodo = dadosFiltrados.reduce((total, dia) => total + dia.prejuizo, 0);
    const diasComRegistros = dadosFiltrados.filter((dia) => dia.prejuizo > 0).length;
    const concentracao = diasComRegistros > 0 && diasComRegistros <= 3;

  return (
    <div
      style={{
        background: "#F7F9F8",
        borderRadius: "14px",
        padding: "18px 12px 12px",
        width: "100%",
      }}
    >
      <div
        style={{
          marginBottom: "20px",
          paddingLeft: "12px",
        }}
      >
        <div
          style={{
            color: "#819188",
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          {`Prejuízo acumulado nos últimos ${periodo} dias`}
        </div>

        <div
        style={{
            display: "flex",
            gap: "6px",
            marginTop: "12px",
        }}
        >
        {([7, 30] as const).map((dias) => (
            <button
            key={dias}
            type="button"
            onClick={() => setPeriodo(dias)}
            style={{
                padding: "7px 13px",
                borderRadius: "8px",
                border: "1px solid #DDE8E0",
                background:
                periodo === dias ? "#173C2C" : "#FFFFFF",
                color:
                periodo === dias ? "#FFFFFF" : "#667A6D",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
            }}
            >
            {dias} dias
            </button>
        ))}
        </div>


        <div
          style={{
            color: "#173C2C",
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: "-1px",
            marginTop: "5px",
          }}
        >
          {moeda(totalPeriodo)}
        </div>
      </div>

      {concentracao && (
        <p style={{ margin: "0 0 8px 12px", color: "#819188", fontSize: "11px" }}>
          Os registros estão concentrados em {diasComRegistros} {diasComRegistros === 1 ? "dia" : "dias"} deste período.
        </p>
      )}

      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={dadosFiltrados}
            margin={{
              top: 12,
              right: 12,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id="gradienteSobra"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#258653"
                  stopOpacity={0.26}
                />

                <stop
                  offset="100%"
                  stopColor="#258653"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="#DEE8E0"
              strokeDasharray="4 5"
            />

            <XAxis
              dataKey="data"
              tickFormatter={formatarData}
              tick={{
                fill: "#819188",
                fontSize: 11,
                fontWeight: 500,
              }}
              tickLine={false}
              axisLine={false}
              minTickGap={35}
              tickMargin={12}
            />

            <YAxis
              tickFormatter={(valor) =>
                `R$ ${valor.toLocaleString("pt-BR")}`
              }
              tick={{
                fill: "#819188",
                fontSize: 11,
                fontWeight: 500,
              }}
              tickLine={false}
              axisLine={false}
              width={75}
              domain={[0, "auto"]}
              allowDecimals={false}
            />

            
            <Tooltip
            labelFormatter={(data) => {
                const dataFormatada = new Date(
                `${String(data)}T12:00:00`
                );

                return dataFormatada.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                });
            }}
            formatter={(valor) => [
                moeda(Number(valor ?? 0)),
                "Prejuízo financeiro",
            ]}
            contentStyle={{
                background: "#173C2C",
                border: "1px solid #285A42",
                borderRadius: "12px",
                padding: "12px 16px",
                boxShadow: "0 8px 24px rgba(23, 60, 44, 0.18)",
                fontFamily: "inherit",
                fontSize: "12px",
            }}
            labelStyle={{
                color: "#DDECE3",
                fontWeight: 600,
                marginBottom: "6px",
                textTransform: "capitalize",
            }}
            itemStyle={{
                color: "#FFFFFF",
                fontWeight: 700,
            }}
            cursor={{
                stroke: "#258653",
                strokeWidth: 1,
                strokeDasharray: "4 5",
            }}
            />


            <Area
              type="monotone"
              dataKey="prejuizo"
              stroke="#258653"
              strokeWidth={3}
              fill="url(#gradienteSobra)"
              activeDot={{
                r: 6,
                fill: "#258653",
                stroke: "#FFFFFF",
                strokeWidth: 2,
              }}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
