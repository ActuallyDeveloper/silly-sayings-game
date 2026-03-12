import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import GameCard from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Pencil, Gamepad2, Users } from "lucide-react";
import { toast } from "sonner";

interface CustomCard {
  id: string;
  text: string;
  card_type: string;
  pick: number;
  created_at: string;
  mode?: string;
}

interface CustomCardsViewProps {
  mode: "singleplayer" | "multiplayer";
}

const CustomCardsView = ({ mode }: CustomCardsViewProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cards, setCards] = useState<CustomCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [cardType, setCardType] = useState<"black" | "white">("white");
  const [pick, setPick] = useState(1);
  const [adding, setAdding] = useState(false);
  const isSP = mode === "singleplayer";
  const authRoute = isSP ? "/sp/auth" : "/mp/auth";

  useEffect(() => {
    if (!user) return;
    fetchCards();
  }, [user, mode]);

  const fetchCards = async () => {
    const { data } = await (supabase as any)
      .from("custom_cards")
      .select("*")
      .eq("user_id", user!.id)
      .eq("mode", mode)
      .order("created_at", { ascending: false });
    setCards(data || []);
    setLoading(false);
  };

  const addCard = async () => {
    if (!text.trim() || !user) return;
    setAdding(true);
    const { error } = await (supabase as any).from("custom_cards").insert({
      user_id: user.id,
      text: text.trim(),
      card_type: cardType,
      pick: cardType === "black" ? pick : 1,
      mode,
    });
    if (error) toast.error("Failed to create card");
    else { toast.success("Card created!"); setText(""); fetchCards(); }
    setAdding(false);
  };

  const deleteCard = async (id: string) => {
    await (supabase as any).from("custom_cards").delete().eq("id", id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    toast.success("Card deleted");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <Pencil className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="text-4xl font-black text-foreground">{isSP ? "SP" : "MP"} Custom Cards</h1>
        <p className="text-muted-foreground">Sign in to create custom cards.</p>
        <Button onClick={() => navigate(authRoute)} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold">Sign In</Button>
      </div>
    );
  }

  const blackCards = cards.filter((c) => c.card_type === "black");
  const whiteCards = cards.filter((c) => c.card_type === "white");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">{isSP ? "Single Player" : "Multiplayer"}</span>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <motion.h1 className="text-3xl sm:text-4xl font-black text-foreground mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          {isSP ? "SP" : "MP"} Custom Cards ✏️
        </motion.h1>

        <motion.div className="bg-secondary rounded-lg p-4 mb-6 space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex gap-2">
            <button onClick={() => setCardType("white")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${cardType === "white" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
              ⬜ White Card
            </button>
            <button onClick={() => setCardType("black")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${cardType === "black" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
              ⬛ Black Card
            </button>
          </div>
          <Input placeholder={cardType === "black" ? 'Enter prompt (use _ for blanks)' : "Enter answer card text"}
            value={text} onChange={(e) => setText(e.target.value)} className="bg-background" />
          {cardType === "black" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Pick count:</Label>
              <select value={pick} onChange={(e) => setPick(Number(e.target.value))}
                className="bg-background border border-border rounded px-2 py-1 text-sm text-foreground">
                <option value={1}>1</option><option value={2}>2</option>
              </select>
            </div>
          )}
          <Button onClick={addCard} disabled={!text.trim() || adding}
            className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold w-full">
            <Plus className="w-4 h-4 mr-1" /> Create Card
          </Button>
        </motion.div>

        <p className="text-xs text-muted-foreground mb-4">
          {blackCards.length} black · {whiteCards.length} white
          {(blackCards.length > 0 || whiteCards.length > 0) && (
            <span className="text-accent ml-2">Select "My Cards" pack in game!</span>
          )}
        </p>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : cards.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No custom cards yet.</p>
        ) : (
          <div className="space-y-4">
            {blackCards.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-2">Black Cards</p>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {blackCards.map((card) => (
                      <motion.div key={card.id} className="relative group" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <GameCard text={card.text} type="black" small logo />
                        <button onClick={() => deleteCard(card.id)}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
            {whiteCards.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-2">White Cards</p>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {whiteCards.map((card) => (
                      <motion.div key={card.id} className="relative group" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <GameCard text={card.text} type="white" small logo />
                        <button onClick={() => deleteCard(card.id)}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomCardsView;
