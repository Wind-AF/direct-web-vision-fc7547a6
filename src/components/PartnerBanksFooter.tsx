import itau from "@/assets/banco-itau.webp";
import santander from "@/assets/banco-santander.png";
import bradesco from "@/assets/banco-bradesco.png";
import nubank from "@/assets/banco-nubank.png";

const fontStack = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const PartnerBanksFooter = () => {
  return (
    <footer
      style={{
        background: "#111827",
        color: "#D1D5DB",
        padding: "0 0 calc(24px + env(safe-area-inset-bottom))",
        borderTop: "1px solid #1F2937",
        textAlign: "center",
        fontFamily: fontStack,
      }}
    >
      <div
        style={{
          background: "#1F2937",
          padding: "20px 16px",
          borderBottom: "1px solid #111827",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.4,
            color: "#9CA3AF",
            marginBottom: 14,
          }}
        >
          BANCOS PARCEIROS
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
            flexWrap: "wrap",
          }}
        >
          <img src={itau} alt="Itaú" style={{ height: 28, width: "auto", objectFit: "contain" }} />
          <img src={santander} alt="Santander" style={{ height: 18, width: "auto", objectFit: "contain" }} />
          <img src={bradesco} alt="Bradesco" style={{ height: 16, width: "auto", objectFit: "contain" }} />
          <img src={nubank} alt="Nubank" style={{ height: 22, width: "auto", objectFit: "contain" }} />
        </div>
      </div>

      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 6 }}>
          © 2026 Bancred LTDA. Todos os direitos reservados.
        </div>
        <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 6 }}>CNPJ 41.906.644/0001-20</div>
        <p style={{ fontSize: 12, color: "#6B7280" }}>
          Empréstimos rápidos e seguros para realizar seus sonhos
        </p>
      </div>
    </footer>
  );
};

export default PartnerBanksFooter;
