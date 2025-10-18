import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface TradingPanelProps {
  symbol: string;
}

export const TradingPanel = ({ symbol }: TradingPanelProps) => {
  const [orderType, setOrderType] = useState("market");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const currentPrice = 45234.56; // Mock current price
  const balance = 10000; // Mock balance

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-foreground">
          <span>Trading Panel</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            ${balance.toLocaleString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="text-success data-[state=active]:bg-success data-[state=active]:text-success-foreground">
              <TrendingUp className="w-4 h-4 mr-1" />
              BUY
            </TabsTrigger>
            <TabsTrigger value="sell" className="text-danger data-[state=active]:bg-danger data-[state=active]:text-danger-foreground">
              <TrendingDown className="w-4 h-4 mr-1" />
              SELL
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="buy" className="space-y-4 mt-4">
            <OrderForm 
              orderType={orderType}
              setOrderType={setOrderType}
              quantity={quantity}
              setQuantity={setQuantity}
              price={price}
              setPrice={setPrice}
              stopLoss={stopLoss}
              setStopLoss={setStopLoss}
              takeProfit={takeProfit}
              setTakeProfit={setTakeProfit}
              currentPrice={currentPrice}
              type="buy"
            />
          </TabsContent>
          
          <TabsContent value="sell" className="space-y-4 mt-4">
            <OrderForm 
              orderType={orderType}
              setOrderType={setOrderType}
              quantity={quantity}
              setQuantity={setQuantity}
              price={price}
              setPrice={setPrice}
              stopLoss={stopLoss}
              setStopLoss={setStopLoss}
              takeProfit={takeProfit}
              setTakeProfit={setTakeProfit}
              currentPrice={currentPrice}
              type="sell"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

interface OrderFormProps {
  orderType: string;
  setOrderType: (type: string) => void;
  quantity: string;
  setQuantity: (quantity: string) => void;
  price: string;
  setPrice: (price: string) => void;
  stopLoss: string;
  setStopLoss: (stopLoss: string) => void;
  takeProfit: string;
  setTakeProfit: (takeProfit: string) => void;
  currentPrice: number;
  type: "buy" | "sell";
}

const OrderForm = ({ 
  orderType, 
  setOrderType, 
  quantity, 
  setQuantity, 
  price, 
  setPrice,
  stopLoss,
  setStopLoss,
  takeProfit,
  setTakeProfit,
  currentPrice,
  type
}: OrderFormProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label>Order Type</Label>
        <Select value={orderType} onValueChange={setOrderType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="market">Market</SelectItem>
            <SelectItem value="limit">Limit</SelectItem>
            <SelectItem value="stop">Stop</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orderType !== "market" && (
        <div className="space-y-2">
          <Label>Price</Label>
          <Input
            type="number"
            placeholder={currentPrice.toString()}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="bg-muted border-border"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Quantity</Label>
        <Input
          type="number"
          placeholder="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="bg-muted border-border"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Stop Loss</Label>
          <Input
            type="number"
            placeholder="Optional"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="bg-muted border-border"
          />
        </div>
        <div className="space-y-2">
          <Label>Take Profit</Label>
          <Input
            type="number"
            placeholder="Optional"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="bg-muted border-border"
          />
        </div>
      </div>

      <Button 
        className={`w-full ${
          type === "buy" 
            ? "bg-success hover:bg-success/90 text-success-foreground" 
            : "bg-danger hover:bg-danger/90 text-danger-foreground"
        }`}
      >
        {type === "buy" ? "Place Buy Order" : "Place Sell Order"}
      </Button>

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Current Price:</span>
          <span>${currentPrice.toLocaleString()}</span>
        </div>
        {quantity && (
          <div className="flex justify-between">
            <span>Total:</span>
            <span>${(parseFloat(quantity) * currentPrice).toLocaleString()}</span>
          </div>
        )}
      </div>
    </>
  );
};