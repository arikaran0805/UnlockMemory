interface UMLoaderProps {
  size?: number;
  dark?: boolean;
  label?: string | null;
}

export default function UMLoader({ size = 48, dark = false, label = null }: UMLoaderProps) {
  const color = dark ? "#5DCAA5" : "#0F6E56";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
      <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
        <path className="um-arc" d="M37.11,45.57 A26,26 0 1,1 21.57,61.11"
          fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"/>
        <rect className="um-bar" x="72" y="64.5" width="54" height="11" rx="5.5" fill={color}/>
        <circle className="um-d1" cx="103" cy="83" r="5.5" fill={color}/>
        <circle className="um-d2" cx="117" cy="82.5" r="5.0" fill={color}/>
      </svg>
      {label && <span style={{ fontSize:11, letterSpacing:"2.5px",
        textTransform:"uppercase", color, opacity:0.7 }}>{label}</span>}
    </div>
  );
}
