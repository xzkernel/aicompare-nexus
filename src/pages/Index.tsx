import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131313]">
      <p className="font-mono text-[11px] uppercase tracking-wider text-white/50">
        Loading workbench…
      </p>
    </div>
  );
}
