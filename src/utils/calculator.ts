import {
  CakeInputs,
  CalculationResult,
  BASE_RECIPES,
  INGREDIENT_UNIT_COSTS,
  CostBreakdown,
  IngredientDetails,
  CakeType,
} from '../types';

/**
 * Perform all calculation steps based on user inputs and apply Nigerian market sanity bounds.
 */
function roundTo500(num: number): number {
  return Math.round(num / 500) * 500;
}

/**
 * Baseline Market Anchors for an 8-inch, simple, vanilla buttercream cake:
 * 1. 1-Layer:
 *    - Budget: ₦22,000 – ₦25,000
 *    - Standard: ₦25,000 – ₦30,000
 *    - Premium: ₦30,000 – ₦35,000
 * 2. 2-Layers:
 *    - Budget: ₦40,000 – ₦45,000
 *    - Standard: ₦45,000 – ₦50,000
 *    - Premium: ₦50,000 – ₦60,000
 */
function getBaseRanges(totalLayers: number) {
  if (totalLayers <= 1) {
    return {
      budgetMin: 22000,
      budgetMax: 25000,
      standardMin: 25000,
      standardMax: 30000,
      premiumMin: 30000,
      premiumMax: 35000,
    };
  } else {
    // 2 layers and above use linear scale from 2-layer baseline specs
    const scale = totalLayers / 2;
    return {
      budgetMin: 40000 * scale,
      budgetMax: 45000 * scale,
      standardMin: 45000 * scale,
      standardMax: 50000 * scale,
      premiumMin: 50000 * scale,
      premiumMax: 55000 * scale,
    };
  }
}

export function calculateCakePrice(inputs: CakeInputs): CalculationResult {
  const {
    cakeType,
    cakeSize,
    complexityLevel,
    frostingType = 'Buttercream',
    numberOfTiers,
    numberOfLayers,
    deliveryCost,
    profitMargin,
    useCustomTiers,
    customTiers,
    layerFlavors,
  } = inputs;

  const isEmpty = !useCustomTiers
    ? (cakeSize === '' || cakeSize === 0 || numberOfLayers === '' || numberOfLayers === 0 || numberOfTiers === '' || numberOfTiers === 0)
    : (numberOfTiers === '' || numberOfTiers === 0 || !customTiers || customTiers.length === 0 || customTiers.some(t => t.size === '' || t.size === 0 || t.layers === '' || t.layers === 0));

  if (isEmpty) {
    return {
      sizeMultiplier: 0,
      ingredientQuantities: {
        flour: 0,
        sugar: 0,
        margarine: 0,
        eggs: 0,
        cocoa: 0,
        milk: 0,
        oil: 0,
        bakingPowder: 0,
        flavouring: 0,
        icingSugar: 0,
        buttercreamMargarine: 0,
        mixedFruits: 0,
        whippingCreamPowder: 0,
        chocolateSlabs: 0,
        liquidCream: 0,
        fondant: 0,
      },
      breakdown: {
        ingredients: {
          flourCost: 0,
          sugarCost: 0,
          margarineCost: 0,
          eggsCost: 0,
          cocoaCost: 0,
          milkCost: 0,
          oilCost: 0,
          bakingPowderCost: 0,
          flavouringCost: 0,
          icingSugarCost: 0,
          buttercreamMargarineCost: 0,
          whippingCreamPowderCost: 0,
          chocolateSlabsCost: 0,
          liquidCreamCost: 0,
          fondantCost: 0,
          mixedFruitsCost: 0,
          total: 0,
        },
        labour: 0,
        overhead: 0,
        packaging: 0,
        delivery: 0,
        complexityExtra: 0,
      },
      totalCost: 0,
      budget: { minPrice: 0, maxPrice: 0, profitMin: 0, profitMax: 0, marginMin: 0, marginMax: 0, isCorrected: false },
      standard: { minPrice: 0, maxPrice: 0, profitMin: 0, profitMax: 0, marginMin: 0, marginMax: 0, isCorrected: false },
      premium: { minPrice: 0, maxPrice: 0, profitMin: 0, profitMax: 0, marginMin: 0, marginMax: 0, isCorrected: false },
      suggestedSellingPrice: 0,
      suggestedMinPrice: 0,
      suggestedMaxPrice: 0,
      expectedMin: 0,
      expectedMax: 0,
      estimatedProfit: 0,
      isAnchorCorrected: false,
      originalUnanchoredPrice: 0,
    };
  }

  const parsedCakeSize = typeof cakeSize === 'number' ? cakeSize : 0;
  const parsedNumberOfTiers = typeof numberOfTiers === 'number' ? numberOfTiers : 0;
  const parsedNumberOfLayers = typeof numberOfLayers === 'number' ? numberOfLayers : 0;
  const parsedCustomTiers = customTiers?.map(t => ({
    size: typeof t.size === 'number' ? t.size : 0,
    layers: typeof t.layers === 'number' ? t.layers : 0,
  })) || [];

  // Let's protect against edge cases (minimum 1 tier, min 1 layer, min 1 inch size)
  const diameter = Math.max(1, parsedCakeSize);
  const tiers = Math.max(1, parsedNumberOfTiers);
  const layers = Math.max(1, parsedNumberOfLayers);

  // 1. Calculate tiersCount and totalLayers
  let tiersCount = tiers;
  let totalLayers = layers * tiers;

  if (useCustomTiers && parsedCustomTiers.length > 0) {
    tiersCount = parsedCustomTiers.length;
    totalLayers = 0;
    for (const t of parsedCustomTiers) {
      totalLayers += Math.max(1, t.layers);
    }
  }

  // 2. Loop through every tier and layer to calculate sum of ingredients for cake sponge
  let totalFlour = 0;
  let totalSugar = 0;
  let totalMargarine = 0;
  let totalEggs = 0;
  let totalCocoa = 0;
  let totalMilk = 0;
  let totalOil = 0;
  let totalBP = 0;
  let totalFlavouring = 0;
  let totalMixedFruits = 0;

  let totalFlavorWeight = 0;
  let totalLayersCount = 0;

  for (let t = 0; t < tiersCount; t++) {
    const tierLayers = useCustomTiers && parsedCustomTiers && parsedCustomTiers[t] ? Math.max(1, parsedCustomTiers[t].layers) : layers;

    for (let l = 0; l < tierLayers; l++) {
      let flavor: Exclude<CakeType, 'Combo'> = 'Vanilla';
      if (cakeType !== 'Combo') {
        flavor = cakeType as Exclude<CakeType, 'Combo'>;
      } else if (layerFlavors && layerFlavors[t] && layerFlavors[t][l]) {
        const itemFlavor = layerFlavors[t][l];
        if (itemFlavor !== 'Combo') {
          flavor = itemFlavor as Exclude<CakeType, 'Combo'>;
        }
      }

      // Compute weight for flavor premium calculation
      let weight = 1.0;
      if (flavor === 'Fruit Cake') {
        weight = 1.30;
      }
      totalFlavorWeight += weight;
      totalLayersCount++;

      const recipe = BASE_RECIPES[flavor];

      // Sum base recipe per layer directly (each layer of standard size gets 1 base recipe unit)
      totalFlour += recipe.flour;
      totalSugar += recipe.sugar;
      totalMargarine += recipe.margarine;
      totalEggs += recipe.eggs;
      totalCocoa += recipe.cocoa;
      totalMilk += recipe.milk;
      totalOil += recipe.oil;
      totalBP += recipe.bakingPowder;
      totalFlavouring += recipe.flavouring;
      totalMixedFruits += (recipe.mixedFruits || 0);
    }
  }

  const calculatedSpongeScalingFactor = totalLayers;

  // 3. Compute Frosting/Covering Ingredients based on total layers scaling factor
  let icingSugarQty = 0;
  let buttercreamMargarineQty = 0;
  let whippingCreamPowderQty = 0;
  let chocolateSlabsQty = 0;
  let liquidCreamQty = 0;
  let fondantQty = 0;

  if (frostingType === 'Whipping Cream') {
    whippingCreamPowderQty = 120 * calculatedSpongeScalingFactor;
  } else if (frostingType === 'Ganache') {
    chocolateSlabsQty = 250 * calculatedSpongeScalingFactor;
    liquidCreamQty = 150 * calculatedSpongeScalingFactor;
  } else if (frostingType === 'Fondant') {
    fondantQty = 260 * calculatedSpongeScalingFactor;
    icingSugarQty = 60 * calculatedSpongeScalingFactor;
    buttercreamMargarineQty = 40 * calculatedSpongeScalingFactor;
  } else {
    // Default Buttercream
    icingSugarQty = 250 * calculatedSpongeScalingFactor;
    buttercreamMargarineQty = 150 * calculatedSpongeScalingFactor;
  }

  const ingredientQuantities: IngredientDetails = {
    flour: totalFlour,
    sugar: totalSugar,
    margarine: totalMargarine,
    eggs: totalEggs,
    cocoa: totalCocoa,
    milk: totalMilk,
    oil: totalOil,
    bakingPowder: totalBP,
    flavouring: totalFlavouring,
    mixedFruits: totalMixedFruits,
    icingSugar: icingSugarQty,
    buttercreamMargarine: buttercreamMargarineQty,
    whippingCreamPowder: whippingCreamPowderQty,
    chocolateSlabs: chocolateSlabsQty,
    liquidCream: liquidCreamQty,
    fondant: fondantQty,
  };

  // 4. Compute ingredient cost breakdown in Naira with calibrated Usage Factor reflecting material pricing inflation standards in Nigeria
  const USAGE_FACTOR = totalLayers > 1 ? 1.25 : 0.85;
  const flourCost = ingredientQuantities.flour * INGREDIENT_UNIT_COSTS.flour * USAGE_FACTOR;
  const sugarCost = ingredientQuantities.sugar * INGREDIENT_UNIT_COSTS.sugar * USAGE_FACTOR;
  const margarineCost = ingredientQuantities.margarine * INGREDIENT_UNIT_COSTS.margarine * USAGE_FACTOR;
  const eggsCost = ingredientQuantities.eggs * INGREDIENT_UNIT_COSTS.eggs * USAGE_FACTOR;
  const cocoaCost = ingredientQuantities.cocoa * INGREDIENT_UNIT_COSTS.cocoa * USAGE_FACTOR;
  const milkCost = ingredientQuantities.milk * INGREDIENT_UNIT_COSTS.milk * USAGE_FACTOR;
  const oilCost = ingredientQuantities.oil * INGREDIENT_UNIT_COSTS.oil * USAGE_FACTOR;
  const bakingPowderCost = ingredientQuantities.bakingPowder * INGREDIENT_UNIT_COSTS.bakingPowder * USAGE_FACTOR;
  const flavouringCost = ingredientQuantities.flavouring * INGREDIENT_UNIT_COSTS.flavouring * USAGE_FACTOR;
  const icingSugarCost = ingredientQuantities.icingSugar * INGREDIENT_UNIT_COSTS.icingSugar * USAGE_FACTOR;
  const buttercreamMargarineCost = ingredientQuantities.buttercreamMargarine * INGREDIENT_UNIT_COSTS.buttercreamMargarine * USAGE_FACTOR;
  const mixedFruitsCost = (ingredientQuantities.mixedFruits || 0) * INGREDIENT_UNIT_COSTS.mixedFruits * USAGE_FACTOR;
  const whippingCreamPowderCost = (ingredientQuantities.whippingCreamPowder || 0) * INGREDIENT_UNIT_COSTS.whippingCreamPowder * USAGE_FACTOR;
  const chocolateSlabsCost = (ingredientQuantities.chocolateSlabs || 0) * INGREDIENT_UNIT_COSTS.chocolateSlabs * USAGE_FACTOR;
  const liquidCreamCost = (ingredientQuantities.liquidCream || 0) * INGREDIENT_UNIT_COSTS.liquidCream * USAGE_FACTOR;
  const fondantCost = (ingredientQuantities.fondant || 0) * INGREDIENT_UNIT_COSTS.fondant * USAGE_FACTOR;

  const totalIngredientCost =
    flourCost +
    sugarCost +
    margarineCost +
    eggsCost +
    cocoaCost +
    milkCost +
    oilCost +
    bakingPowderCost +
    flavouringCost +
    icingSugarCost +
    buttercreamMargarineCost +
    mixedFruitsCost +
    whippingCreamPowderCost +
    chocolateSlabsCost +
    liquidCreamCost +
    fondantCost;

  // 5. Complexity Charges (Simple, Moderate, Complex Flat additions)
  let complexityExtra = 0;
  if (complexityLevel === 'Moderate') {
    complexityExtra = 3000;
  } else if (complexityLevel === 'Complex') {
    complexityExtra = 7000;
  }

  // 6. Labor Model (Per Tier)
  let laborCostPerTier = totalLayers > 1 ? 11000 : 6000;
  if (complexityLevel === 'Moderate') {
    laborCostPerTier = totalLayers > 1 ? 14000 : 8000;
  } else if (complexityLevel === 'Complex') {
    laborCostPerTier = totalLayers > 1 ? 18000 : 12000;
  }
  const totalLabourCost = laborCostPerTier * tiersCount;

  const overhead = totalLayers > 1 ? 5000 : 2500; // Flat overhead (e.g. diesel power, water, sanitation)
  const packaging = totalLayers > 1 ? 2000 : 1500; // Calibrated sturdy carton and cake board cost

  // 7. Direct Base Production Cost
  const totalCost =
    totalIngredientCost +
    totalLabourCost +
    overhead +
    packaging +
    deliveryCost +
    complexityExtra;

  // 8. Profit markup/margin
  const rawSuggestedPrice = totalCost * (1 + profitMargin);

  // 9. Real-day Market Anchor Bounds
  let peakDiameter = diameter;
  if (useCustomTiers && customTiers && customTiers.length > 0) {
    let maxCustomSize = 1;
    for (const t of customTiers) {
      const s = typeof t.size === 'number' ? t.size : 0;
      const tierSize = Math.max(1, s);
      if (tierSize > maxCustomSize) {
        maxCustomSize = tierSize;
      }
    }
    peakDiameter = maxCustomSize;
  }

  let sizeFactor = peakDiameter / 8;
  if (peakDiameter === 6) {
    sizeFactor = 0.75;
  } else if (peakDiameter === 8) {
    sizeFactor = 1.0;
  } else if (peakDiameter === 10) {
    sizeFactor = 1.4;
  } else if (peakDiameter === 12) {
    sizeFactor = 1.8;
  }

  const volumeScale = totalLayers / 2;

  let frostingPremiumScale = 1.0;
  if (frostingType === 'Whipping Cream') {
    frostingPremiumScale = 1.05;
  } else if (frostingType === 'Ganache') {
    frostingPremiumScale = 1.45;
  } else if (frostingType === 'Fondant') {
    frostingPremiumScale = 1.22;
  }

  let flavorPremiumScale = 1.0;
  if (cakeType === 'Fruit Cake') {
    flavorPremiumScale = 1.30;
  } else if (cakeType === 'Red Velvet' || cakeType === 'Chocolate') {
    flavorPremiumScale = 1.10;
  } else if (cakeType === 'Combo') {
    flavorPremiumScale = totalLayersCount > 0 ? (totalFlavorWeight / totalLayersCount) : 1.0;
  }

  // --- MULTI-TIER MARKET ANCHOR CALIBRATIONS ---
  const baseRanges = getBaseRanges(calculatedSpongeScalingFactor);
  const marketScaleFactor = sizeFactor * frostingPremiumScale * flavorPremiumScale;

  const calBudgetMin = baseRanges.budgetMin * marketScaleFactor + complexityExtra + deliveryCost;
  const calBudgetMax = baseRanges.budgetMax * marketScaleFactor + complexityExtra + deliveryCost;

  const calStandardMin = baseRanges.standardMin * marketScaleFactor + complexityExtra + deliveryCost;
  const calStandardMax = baseRanges.standardMax * marketScaleFactor + complexityExtra + deliveryCost;

  const calPremiumMin = baseRanges.premiumMin * marketScaleFactor + complexityExtra + deliveryCost;
  const calPremiumMax = baseRanges.premiumMax * marketScaleFactor + complexityExtra + deliveryCost;

  // Compute raw margin-based prices
  const rawBudgetMin = totalCost * (1 + 0.20);
  const rawBudgetMax = totalCost * (1 + 0.30);

  const rawStandardMin = totalCost * (1 + 0.40);
  const rawStandardMax = totalCost * (1 + 0.60);

  const rawPremiumMin = totalCost * (1 + 0.70);
  const rawPremiumMax = totalCost * (1 + 1.00);

  // Clamping helper for market calibration
  const clamp = (val: number, min: number, max: number): { value: number; isCorrected: boolean } => {
    if (val < min) {
      return { value: min, isCorrected: true };
    }
    if (val > max) {
      return { value: max, isCorrected: true };
    }
    return { value: val, isCorrected: false };
  };

  const budgetMinRes = clamp(rawBudgetMin, calBudgetMin, calBudgetMax);
  const budgetMaxRes = clamp(rawBudgetMax, calBudgetMin, calBudgetMax);

  const standardMinRes = clamp(rawStandardMin, calStandardMin, calStandardMax);
  const standardMaxRes = clamp(rawStandardMax, calStandardMin, calStandardMax);

  const premiumMinRes = clamp(rawPremiumMin, calPremiumMin, calPremiumMax);
  const premiumMaxRes = clamp(rawPremiumMax, calPremiumMin, calPremiumMax);

  // Apply rounding and guarantee professional ₦2,005 - ₦5,005 ranges instead of identical min/max.
  let finalBudgetMin = roundTo500(budgetMinRes.value);
  let finalBudgetMax = roundTo500(budgetMaxRes.value);
  if (finalBudgetMax <= finalBudgetMin) {
    finalBudgetMax = Math.min(roundTo500(calBudgetMax), finalBudgetMin + 3000);
    finalBudgetMin = Math.max(roundTo500(calBudgetMin), finalBudgetMax - 3000);
  }

  let finalStandardMin = roundTo500(standardMinRes.value);
  let finalStandardMax = roundTo500(standardMaxRes.value);
  if (finalStandardMax <= finalStandardMin) {
    finalStandardMax = Math.min(roundTo500(calStandardMax), finalStandardMin + 4000);
    finalStandardMin = Math.max(roundTo500(calStandardMin), finalStandardMax - 4000);
  }

  let finalPremiumMin = roundTo500(premiumMinRes.value);
  let finalPremiumMax = roundTo500(premiumMaxRes.value);
  if (finalPremiumMax <= finalPremiumMin) {
    finalPremiumMax = Math.min(roundTo500(calPremiumMax), finalPremiumMin + 4000);
    finalPremiumMin = Math.max(roundTo500(calPremiumMin), finalPremiumMax - 4000);
  }

  const isAnchorCorrected = budgetMinRes.isCorrected || budgetMaxRes.isCorrected ||
                            standardMinRes.isCorrected || standardMaxRes.isCorrected ||
                            premiumMinRes.isCorrected || premiumMaxRes.isCorrected;

  const budget = {
    minPrice: finalBudgetMin,
    maxPrice: finalBudgetMax,
    profitMin: finalBudgetMin - totalCost,
    profitMax: finalBudgetMax - totalCost,
    marginMin: 20,
    marginMax: 30,
    isCorrected: budgetMinRes.isCorrected || budgetMaxRes.isCorrected,
  };

  const standard = {
    minPrice: finalStandardMin,
    maxPrice: finalStandardMax,
    profitMin: finalStandardMin - totalCost,
    profitMax: finalStandardMax - totalCost,
    marginMin: 40,
    marginMax: 60,
    isCorrected: standardMinRes.isCorrected || standardMaxRes.isCorrected,
  };

  const premium = {
    minPrice: finalPremiumMin,
    maxPrice: finalPremiumMax,
    profitMin: finalPremiumMin - totalCost,
    profitMax: finalPremiumMax - totalCost,
    marginMin: 70,
    marginMax: 100,
    isCorrected: premiumMinRes.isCorrected || premiumMaxRes.isCorrected,
  };

  // Backwards compatibility mapping to Standard Tier
  const suggestedSellingPrice = roundTo500((finalStandardMin + finalStandardMax) / 2);
  const suggestedMinPrice = finalStandardMin;
  const suggestedMaxPrice = finalStandardMax;
  const expectedMin = roundTo500(calStandardMin);
  const expectedMax = roundTo500(calStandardMax);
  const estimatedProfit = suggestedSellingPrice - totalCost;

  const breakdown: CostBreakdown = {
    ingredients: {
      flourCost,
      sugarCost,
      margarineCost,
      eggsCost,
      cocoaCost,
      milkCost,
      oilCost,
      bakingPowderCost,
      flavouringCost,
      icingSugarCost,
      buttercreamMargarineCost,
      whippingCreamPowderCost,
      chocolateSlabsCost,
      liquidCreamCost,
      fondantCost,
      mixedFruitsCost,
      total: totalIngredientCost,
    },
    labour: totalLabourCost,
    overhead,
    packaging,
    delivery: deliveryCost,
    complexityExtra,
  };

  return {
    sizeMultiplier: sizeFactor,
    ingredientQuantities,
    breakdown,
    totalCost,
    budget,
    standard,
    premium,
    suggestedSellingPrice,
    suggestedMinPrice,
    suggestedMaxPrice,
    expectedMin,
    expectedMax,
    estimatedProfit,
    isAnchorCorrected,
    originalUnanchoredPrice: rawSuggestedPrice,
  };
}
