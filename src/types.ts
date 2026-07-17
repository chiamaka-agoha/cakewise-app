/**
 * TypeScript types and domain constants for the Cake Pricing Calculator.
 */

export type CakeType = 'Red Velvet' | 'Vanilla' | 'Chocolate' | 'Fruit Cake' | 'Combo';
export type ComplexityLevel = 'Simple' | 'Moderate' | 'Complex';
export type FrostingType = 'Buttercream' | 'Whipping Cream' | 'Ganache' | 'Fondant';

export interface TierConfig {
  size: number | '';   // in inches, e.g. 10
  layers: number | ''; // e.g. 3
}

export interface CakeInputs {
  cakeType: CakeType;
  cakeSize: number | ''; // in inches
  complexityLevel: ComplexityLevel;
  frostingType?: FrostingType; // Default to 'Buttercream'
  numberOfTiers: number | '';
  numberOfLayers: number | ''; // Number of layers per tier
  deliveryCost: number; // in Naira
  profitMargin: number; // e.g. 0.30 for 30% or 1.15 for 115%
  referenceImage?: string; // base64 data-url or empty
  referenceImageName?: string; // file name
  useCustomTiers?: boolean;
  customTiers?: TierConfig[];
  layerFlavors?: CakeType[][]; // outer index is tier, inner index is layer flavor
  businessLevel?: 'Beginner' | 'Growing' | 'Premium';
}

export interface IngredientDetails {
  flour: number; // g
  sugar: number; // g
  margarine: number; // g (replacing butter with margarine as standard in Nigeria)
  eggs: number; // units
  cocoa: number; // g
  milk: number; // ml
  oil: number; // ml
  bakingPowder: number; // g
  flavouring: number; // ml
  icingSugar: number; // g (for buttercream or fondant crumb-coat)
  buttercreamMargarine: number; // g (for buttercream or fondant crumb-coat)
  mixedFruits?: number; // g (for rich fruit cake)
  whippingCreamPowder?: number; // g (for whipping cream frosting)
  chocolateSlabs?: number; // g (for rich ganache)
  liquidCream?: number; // ml (liquid double cream or whipping cream)
  fondant?: number; // g (rolled fondant covering)
}

// INGREDIENT UNIT COSTS (recalibrated with current 2026 Nigerian market prices)
export const INGREDIENT_UNIT_COSTS = {
  flour: 1.27,             // ₦1.27 per gram (Derived from 1.5kg = ₦1900)
  sugar: 3.00,             // ₦3.00 per gram (500g = ₦1500)
  margarine: 3.80,         // ₦3.80 per gram (500g = ₦1900)
  eggs: 250.00,            // ₦250.00 per egg unit
  cocoa: 20.00,            // ₦20.00 per gram (realistic cocoa pricing)
  milk: 3.00,              // ₦3.00 per ml
  oil: 2.00,               // ₦2.00 per ml (500ml = ₦1000)
  packaging: 1000,         // Flat rate for cake carton / box and cake board (₦1000 as requested)
  bakingPowder: 20.00,     // ₦20.00 per gram (exactlySpecified: 10g = ₦200)
  flavouring: 26.67,       // ₦26.67 per ml (exactlySpecified: 15ml bottle/essence portion = ₦400 per layer)
  icingSugar: 3.50,        // ₦3.50 per gram (buttercream icing sugar)
  buttercreamMargarine: 4.50, // ₦4.50 per gram (butter/margarine for buttercream frosting)
  mixedFruits: 9.50,       // ₦9.50 per gram of rich dried fruits & alcohol soaking
  whippingCreamPowder: 12.50, // ₦12.50 per gram
  chocolateSlabs: 11.00,      // ₦11.00 per gram
  liquidCream: 6.00,          // ₦6.00 per ml
  fondant: 5.20,              // ₦5.20 per gram
};

// BASE RECIPES QUANTITIES (Defined PER LAYER for a standard 8-inch cake)
export const BASE_RECIPES: Record<Exclude<CakeType, 'Combo'>, IngredientDetails> = {
  'Red Velvet': {
    flour: 250,      // g per layer
    sugar: 200,      // g per layer
    margarine: 250,  // g per layer
    eggs: 5,         // unit per layer
    cocoa: 20,       // g per layer
    milk: 100,       // ml per layer
    oil: 60,         // ml per layer
    bakingPowder: 10,// g per layer
    flavouring: 15,  // ml per layer
    icingSugar: 250, // g for buttercream frosting
    buttercreamMargarine: 150, // g for buttercream frosting
    mixedFruits: 0,
  },
  'Vanilla': {
    flour: 250,      // g per layer (exactly specified: 250g)
    sugar: 200,      // g per layer (exactly specified: 200g)
    margarine: 250,  // g per layer (exactly specified: 250g)
    eggs: 5,         // unit per layer (exactly specified: 5 eggs)
    cocoa: 0,        // g per layer
    milk: 100,       // ml per layer
    oil: 50,         // ml per layer
    bakingPowder: 10,// g per layer (exactly specified: 10g = ₦200)
    flavouring: 15,  // ml per layer (exactly specified: 15ml = ₦400)
    icingSugar: 250, // g for buttercream frosting
    buttercreamMargarine: 150, // g for buttercream frosting
    mixedFruits: 0,
  },
  'Chocolate': {
    flour: 250,      // g per layer
    sugar: 200,      // g per layer
    margarine: 250,  // g per layer
    eggs: 5,         // unit per layer
    cocoa: 35,       // g per layer
    milk: 110,       // ml per layer
    oil: 50,         // ml per layer
    bakingPowder: 10,// g per layer
    flavouring: 15,  // ml per layer
    icingSugar: 250, // g for buttercream frosting
    buttercreamMargarine: 150, // g for buttercream frosting
    mixedFruits: 0,
  },
  'Fruit Cake': {
    flour: 250,      // g per layer
    sugar: 180,      // g per layer
    margarine: 250,  // g per layer
    eggs: 6,         // unit per layer (dense fruit cakes use more eggs)
    cocoa: 0,        // g per layer
    milk: 50,        // ml per layer
    oil: 20,         // ml per layer
    bakingPowder: 8, // g per layer
    flavouring: 25,  // ml per layer (extra flavouring/rum essence)
    icingSugar: 250, // g for buttercream frosting
    buttercreamMargarine: 150, // g for buttercream frosting
    mixedFruits: 180, // g of rich soaked dried fruits / mixed peel
  }
};

export interface ComplexityConfig {
  multiplier: number;
  extraCost: number;
}

export const COMPLEXITY_CONFIGS: Record<ComplexityLevel, ComplexityConfig> = {
  Simple: {
    multiplier: 1.0,
    extraCost: 0,
  },
  Moderate: {
    multiplier: 1.3,
    extraCost: 3000,
  },
  Complex: {
    multiplier: 1.6,
    extraCost: 7000,
  },
};

export interface CostBreakdown {
  ingredients: {
    flourCost: number;
    sugarCost: number;
    margarineCost: number;
    eggsCost: number;
    cocoaCost: number;
    milkCost: number;
    oilCost: number;
    bakingPowderCost: number;
    flavouringCost: number;
    icingSugarCost: number;
    buttercreamMargarineCost: number;
    whippingCreamPowderCost?: number;
    chocolateSlabsCost?: number;
    liquidCreamCost?: number;
    fondantCost?: number;
    mixedFruitsCost?: number;
    total: number;
  };
  labour: number;
  overhead: number;
  packaging: number;
  delivery: number;
  complexityExtra: number;
}

export interface PricingTierDetails {
  minPrice: number;
  maxPrice: number;
  profitMin: number;
  profitMax: number;
  marginMin: number; // percentage, e.g. 20 for 20%
  marginMax: number; // percentage, e.g. 30 for 30%
  isCorrected: boolean;
}

export interface CalculationResult {
  sizeMultiplier: number;
  ingredientQuantities: IngredientDetails;
  breakdown: CostBreakdown;
  totalCost: number;
  budget: PricingTierDetails;
  standard: PricingTierDetails;
  premium: PricingTierDetails;
  suggestedSellingPrice: number;
  suggestedMinPrice: number;   // Suggested price range minimum
  suggestedMaxPrice: number;   // Suggested price range maximum
  expectedMin: number;         // Market benchmark minimum (Standard calibrated min)
  expectedMax: number;         // Market benchmark maximum (Standard calibrated max)
  estimatedProfit: number;
  isAnchorCorrected: boolean;  // Tells the UI if any tier applied the Naija Market sanity check
  originalUnanchoredPrice: number; // Raw standard cost * markup for comparison
}

export interface SavedCalculation {
  id: string;
  name: string; // Order reference or customer name
  date: string; // ISO date string
  inputs: CakeInputs;
  result: CalculationResult;
}
