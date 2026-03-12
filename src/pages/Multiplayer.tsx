import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft } from "lucide-react";

const Multiplayer = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <Users className="w-16 h-16 text-muted-foreground/30" />
      <h1 className="text-4xl font-black text-foreground">Multiplayer</h1>
      <motion.p
        className="text-muted-foreground text-center max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Coming soon. Gather your horrible friends and play together in real-time.
      </motion.p>
      <Button
        variant="outline"
        onClick={() => navigate("/")}
        className="border-muted-foreground/30 mt-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back Home
      </Button>
    </div>
  );
};

export default Multiplayer;
