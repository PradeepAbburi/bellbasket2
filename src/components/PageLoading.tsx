import { motion } from "framer-motion";

const PageLoading = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#202020] z-[9999]">
    <div className="animate-pulse">
      <span className="text-2xl md:text-3xl font-black tracking-tighter text-white">
        BellBasket
      </span>
    </div>
  </div>
);

export default PageLoading;
