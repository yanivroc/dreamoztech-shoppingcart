import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart, DELIVERY_FEE } from "@/lib/cart";
import { formatPrice } from "@/lib/currency";
import { useNavigate } from "@tanstack/react-router";

export function CartDrawer({ country }: { country?: string | null }) {
  const { items, isOpen, setOpen, setQty, remove, subtotal, count } = useCart();
  const navigate = useNavigate();
  const total = subtotal + (items.length > 0 ? DELIVERY_FEE : 0);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your Cart ({count})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Your cart is empty.</p>
          ) : (
            items.map((i) => (
              <div key={i.id} className="flex gap-3 border-b pb-4">
                {i.image && (
                  <img src={i.image} alt={i.title} className="h-16 w-16 rounded object-cover border" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm line-clamp-2">{i.title}</div>
                  <div className="text-primary text-sm font-semibold mt-1">
                    {formatPrice(i.price, country)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => setQty(i.id, i.qty - 1)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded border hover:bg-accent disabled:opacity-40"
                      aria-label="Decrease"
                      disabled={i.qty <= (i.minQty ?? 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm w-6 text-center">{i.qty}</span>
                    <button
                      onClick={() => setQty(i.id, i.qty + 1)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded border hover:bg-accent disabled:opacity-40"
                      aria-label="Increase"
                      disabled={i.maxQty != null && i.qty >= i.maxQty}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    {i.maxQty != null && i.qty >= i.maxQty && (
                      <span className="text-[10px] text-muted-foreground ml-1">Max {i.maxQty}</span>
                    )}
                    <button
                      onClick={() => remove(i.id)}
                      className="ml-auto h-7 w-7 inline-flex items-center justify-center rounded text-destructive hover:bg-destructive/10"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="border-t pt-4 flex-col gap-2 sm:flex-col">
            <div className="w-full space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal, country)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{formatPrice(DELIVERY_FEE, country)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatPrice(total, country)}</span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/checkout" });
              }}
            >
              Checkout
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
