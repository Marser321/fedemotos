import { describe, expect, it } from "vitest";
import {
  communicationEventLabel,
  toCommunicationEventType,
  toCommunicationSourceType,
} from "./comunicaciones";

describe("servicio de comunicaciones", () => {
  it("normaliza eventos y fuentes desconocidas", () => {
    expect(toCommunicationEventType("orden_lista")).toBe("orden_lista");
    expect(toCommunicationEventType("otro")).toBe("orden_lista");
    expect(toCommunicationSourceType("auxilio")).toBe("auxilio");
    expect(toCommunicationSourceType("otro")).toBe("orden");
  });

  it("expone etiquetas operativas legibles", () => {
    expect(communicationEventLabel("orden_lista")).toContain("Moto lista");
    expect(communicationEventLabel("service_control_30")).toContain("Control");
  });
});
