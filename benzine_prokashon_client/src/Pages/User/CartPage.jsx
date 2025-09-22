import React from "react";
import { useCart } from "../../Provider/CartContext";
import { ShoppingCart } from "lucide-react";
import { getDiscountedPrice, toBanglaNumber } from "../../lib/utils";
import { toast } from "sonner";

const CartPage = () => {
  const { cart, removeFromCart, updateQty } = useCart();

  const totalPrice = cart.reduce(
    (acc, item) => acc + getDiscountedPrice(item) * item.qty,
    0
  );

  // 📌 Generate message
  const generateMessage = () => {
    let message = "📚 নতুন অর্ডার:\n\n";
    cart.forEach((item, index) => {
      message += `${toBanglaNumber(index + 1)}. ${
        item.productNameBn
      } (${toBanglaNumber(item.qty)} টি) - ৳${toBanglaNumber(
        getDiscountedPrice(item) * item.qty
      )}\n`;
    });
    message += `\nমোট: ৳${toBanglaNumber(totalPrice)}\n\nঅর্ডার কনফার্ম করুন।`;
    return message;
  };

  // 📌 WhatsApp Order
  const handleWhatsAppOrder = () => {
    const phoneNumber = "8801919525143";
    const msg = generateMessage();

    navigator.clipboard.writeText(msg).then(() => {
      toast(" অর্ডার মেসেজ কপি হয়েছে। WhatsApp এ গিয়ে Paste করুন।");
      setTimeout(() => {
        window.open(`https://wa.me/${phoneNumber}`, "_blank");
      }, 2000);
    });
  };

  // 📌 Facebook Order (cannot prefill, so copy to clipboard)
  const handleFacebookOrder = () => {
    const fbPageUrl = "https://www.facebook.com/benzeneprokashon";
    const msg = generateMessage();

    // Copy to clipboard
    navigator.clipboard.writeText(msg).then(() => {
      toast(" আপনার অর্ডার মেসেজ কপি হয়েছে। Messenger এ গিয়ে Paste করুন।");

      // ⏳ wait 2 seconds before opening FB Messenger
      setTimeout(() => {
        window.open(fbPageUrl, "_blank");
      }, 2000);
    });
  };

  return (
    <div className="max-w-7xl mx-auto pt-32 px-2 md:px-4 lg:px-0">
      <h2 className="text-2xl font-bold mb-6 flex gap-2 items-center">
        <ShoppingCart /> Your Cart
      </h2>

      {cart.length === 0 ? (
        <p className="text-gray-500">Your cart is empty.</p>
      ) : (
        <div className="space-y-4">
          {cart.map((item) => {
            const discounted = getDiscountedPrice(item);
            return (
              <div
                key={item._id}
                className="flex justify-between items-center border-b pb-2"
              >
                <div className="flex items-center md:gap-4">
                  <img
                    src={item.coverImage}
                    alt={item.productNameBn}
                    className="w-16 object-cover mr-4"
                  />
                  <div>
                    <h3 className="font-semibold">{item.productNameBn}</h3>
                    <p className="text-sm text-gray-600">{item.authorName}</p>

                    <div className="flex gap-2">
                      <span className="text-primary font-semibold">
                        ৳ {toBanglaNumber(discounted)}
                      </span>
                      {discounted < item.listPrice && (
                        <span className="line-through text-gray-500 text-sm">
                          ৳ {toBanglaNumber(item.listPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Qty Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item._id, item.qty - 1)}
                    className="px-2 bg-gray-200 rounded"
                  >
                    -
                  </button>
                  <span>{item.qty}</span>
                  <button
                    onClick={() => updateQty(item._id, item.qty + 1)}
                    className="px-2 bg-gray-200 rounded"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="ml-4 text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="mt-6 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>৳ {toBanglaNumber(totalPrice)}</span>
          </div>

          {/* Order Buttons */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={handleFacebookOrder}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
            >
              Order with Facebook
            </button>
            <button
              onClick={handleWhatsAppOrder}
              className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
            >
              Order with WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
