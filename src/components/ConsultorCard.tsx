import consultor from "@/assets/consultor-joao.jpeg";

const fontStack = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

interface ConsultorCardProps {
  subtitle?: string;
}

const ConsultorCard = ({ subtitle = "Consultor Bancred · Acompanhando sua simulação" }: ConsultorCardProps) => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 16,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 10px rgba(15,23,42,0.04)",
        fontFamily: fontStack,
      }}
    >
      <img
        src={consultor}
        alt="João Silva"
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>João Silva</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#10B981", fontWeight: 600 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10B981",
                display: "inline-block",
              }}
            />
            Online
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
};

export default ConsultorCard;
