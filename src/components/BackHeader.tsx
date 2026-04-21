import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function BackHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // حاول العودة للصفحة السابقة إذا وجدت، وإلا عد للصفحة الرئيسية
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border-b border-olive-100 bg-paper">
      <button
        onClick={handleBack}
        className="p-2 -ml-2 text-olive-700 hover:bg-olive-100 rounded-xl transition-colors"
        aria-label="رجوع"
      >
        <ArrowRight className="w-6 h-6" />
      </button>
      <h1 className="text-lg font-bold text-olive-900">{title}</h1>
    </div>
  );
}
