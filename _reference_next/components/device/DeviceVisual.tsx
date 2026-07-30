import type { DeviceCategory } from "../../lib/types";

export function DeviceVisual({ category, accent, label, small = false }: { category: DeviceCategory; accent: string; label: string; small?: boolean }) {
  return (
    <div className={`device-visual ${category} ${small ? "small" : ""}`} style={{ "--device-accent": accent } as React.CSSProperties} role="img" aria-label={`Decorative ${category} marker for ${label}; official image feed pending`}>
      <div className="device-shape">
        <div className="device-screen"><span>{category === "watch" ? "◌" : "CM"}</span></div>
        {category === "phone" && <div className="camera-stack"><i /><i /><i /></div>}
      </div>
      <span className="image-pending">Official image pending</span>
    </div>
  );
}
