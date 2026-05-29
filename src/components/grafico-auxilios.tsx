"use client";

import {
    Label,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
} from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

const configuracionGrafico = {
    auxilios: {
        label: "Auxilios",
    },
    disponibles: {
        label: "Disponibles",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig;

interface PropsGrafico {
    restantes: number;
    total: number;
}

export function GraficoAuxilios({ restantes, total }: PropsGrafico) {
    const datosGrafico = [
        { name: "auxilios", valor: restantes, fill: "var(--color-disponibles)" },
    ];

    const anguloFinal = total > 0 ? (restantes / total) * 360 : 0;

    return (
        <Card className="flex flex-col bg-zinc-950 border-zinc-900">
            <CardHeader className="items-center pb-0">
                <CardTitle className="text-zinc-100 italic uppercase tracking-widest text-sm">Estado de Cobertura</CardTitle>
                <CardDescription className="text-zinc-500">Auxilios del mes actual</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={configuracionGrafico}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <RadialBarChart
                        data={datosGrafico}
                        startAngle={90}
                        endAngle={90 + anguloFinal}
                        innerRadius={80}
                        outerRadius={110}
                    >
                        <PolarGrid
                            gridType="circle"
                            radialLines={false}
                            stroke="none"
                            className="first:fill-zinc-900 last:fill-zinc-950"
                            polarRadius={[86, 74]}
                        />
                        <RadialBar dataKey="valor" background cornerRadius={10} />
                        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-zinc-100 text-4xl font-bold"
                                                >
                                                    {restantes}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-zinc-500 text-xs uppercase"
                                                >
                                                    de {total} disponibles
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </PolarRadiusAxis>
                    </RadialBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
