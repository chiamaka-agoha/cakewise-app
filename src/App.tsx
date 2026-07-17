/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Cake,
  Layers,
  Sparkles,
  Truck,
  Trash2,
  Save,
  RotateCcw,
  AlertCircle,
  Plus,
  Minus,
  History,
  Info,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  BadgePercent,
  TrendingUp,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Crown,
  Lock,
  Shield,
  Check,
  Zap,
  X,
  ArrowRight,
  User,
  Mail,
  Camera,
  Calculator,
  LogOut
} from 'lucide-react';
import { CakeInputs, CakeType, ComplexityLevel, FrostingType, SavedCalculation, INGREDIENT_UNIT_COSTS, BASE_RECIPES } from './types';
import { calculateCakePrice } from './utils/calculator';
import { motion, AnimatePresence } from 'motion/react';

const LOCAL_STORAGE_KEY = 'cake_calculator_calculations_v1';

// --- Helpers for AI Cake Vision Report ---
const getFormattedSizesString = (sizes: number[]) => {
  if (!sizes || sizes.length === 0) return "8-inch";
  if (sizes.length === 1) return `${sizes[0]}-inch`;
  if (sizes.length === 2) {
    return `${sizes[1]}-inch top, ${sizes[0]}-inch bottom`;
  }
  if (sizes.length === 3) {
    return `${sizes[2]}-inch top, ${sizes[1]}-inch middle, ${sizes[0]}-inch bottom`;
  }
  return sizes.map((sz, i) => {
    if (i === 0) return `${sz}-inch bottom`;
    if (i === sizes.length - 1) return `${sz}-inch top`;
    return `${sz}-inch tier ${i + 1}`;
  }).reverse().join(', ');
};

const getFormattedLayersString = (layers: number[]) => {
  if (!layers || layers.length === 0) return "2 layers per tier";
  const first = layers[0];
  const allSame = layers.every(l => l === first);
  if (allSame) {
    return `${first} layer${first > 1 ? 's' : ''} per tier`;
  }
  return layers.map((l, i) => {
    if (i === 0) return `${l} layers bottom`;
    if (i === layers.length - 1) return `${l} layers top`;
    return `${l} layers middle`;
  }).reverse().join(', ');
};

const getFormattedDesignString = (frosting: string, elements: string[], complexity: string) => {
  const elStr = elements && elements.length > 0 ? ` with ${elements.slice(0, 2).join(' & ')}` : '';
  return `${frosting}${elStr} (${complexity.toLowerCase()})`;
};

export default function App() {
  // --- Active Calculator Inputs State ---
  const [inputs, setInputs] = useState<CakeInputs>(() => {
    try {
      const stored = localStorage.getItem('cakewise_active_inputs');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading cakewise_active_inputs from localStorage', e);
    }
    return {
      cakeType: 'Vanilla',
      cakeSize: '',
      complexityLevel: 'Simple',
      frostingType: 'Buttercream',
      numberOfTiers: '',
      numberOfLayers: '',
      deliveryCost: 0,
      profitMargin: 1.15, // Optimal standard markup to land benchmark simple 8" vanilla cake at ₦27,215
      referenceImage: '',
      referenceImageName: '',
      useCustomTiers: false,
      customTiers: [],
      businessLevel: 'Growing',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('cakewise_active_inputs', JSON.stringify(inputs));
    } catch (e) {
      console.error('Error writing cakewise_active_inputs to localStorage', e);
    }
  }, [inputs]);

  const [bakerName, setBakerName] = useState<string>(() => {
    try {
      return localStorage.getItem('cakewise_baker_name') || '';
    } catch {
      return '';
    }
  });

  const [bakerEmail, setBakerEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('cakewise_baker_email') || '';
    } catch {
      return '';
    }
  });

  const [sessionStarted, setSessionStarted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cakewise_session_started') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cakewise_baker_name', bakerName);
    } catch (e) {
      console.error(e);
    }
  }, [bakerName]);

  useEffect(() => {
    try {
      localStorage.setItem('cakewise_baker_email', bakerEmail);
    } catch (e) {
      console.error(e);
    }
  }, [bakerEmail]);

  useEffect(() => {
    try {
      localStorage.setItem('cakewise_session_started', sessionStarted.toString());
    } catch (e) {
      console.error(e);
    }
  }, [sessionStarted]);

  // --- Active Calculations Order Info ---
  const [orderName, setOrderName] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [loadedSuccess, setLoadedSuccess] = useState<string>('');
  const [manualPriceOverride, setManualPriceOverride] = useState<string>('');

  // --- Premium Upgrade & Scan Limit States ---
  const [isPremiumUser, setIsPremiumUser] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cakewise_is_premium') === 'true';
    } catch {
      return false;
    }
  });
  const [dailyScansLeft, setDailyScansLeft] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('cakewise_scans_left');
      return stored !== null ? parseInt(stored, 10) : 3;
    } catch {
      return 3;
    }
  });
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [selectedPlanTab, setSelectedPlanTab] = useState<'free' | 'weekly' | 'monthly'>('monthly');
  const [paymentPlanToCheckout, setPaymentPlanToCheckout] = useState<'standard_weekly' | 'standard_monthly' | 'premium_weekly' | 'premium_monthly' | null>(null);
  const [paymentFeedback, setPaymentFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [checkoutEmail, setCheckoutEmail] = useState<string>('');
  const [checkoutReference, setCheckoutReference] = useState<string>('');

  useEffect(() => {
    if (paymentPlanToCheckout) {
      setCheckoutEmail(bakerEmail || '');
      setCheckoutReference('CW-ref-' + Math.floor(Math.random() * 100000000) + '-' + Date.now());
    }
  }, [paymentPlanToCheckout, bakerEmail]);

  const handlePaystackPayment = (
    plan: 'standard_weekly' | 'standard_monthly' | 'premium_weekly' | 'premium_monthly',
    email: string,
    reference: string
  ) => {
    const isStandard = plan.startsWith('standard');
    const cycle = plan.endsWith('weekly') ? 'weekly' : 'monthly';
    const amountNGN = isStandard 
      ? (cycle === 'weekly' ? 500 : 2000) 
      : (cycle === 'weekly' ? 2000 : 5000);
    const amountKobo = amountNGN * 100;

    const planName = isStandard ? "Standard Plan" : "Premium Plan";

    if (!email || !email.includes('@')) {
      setPaymentFeedback({
        text: 'Please provide a valid email address to complete your checkout.',
        type: 'error'
      });
      return;
    }

    const paystackPop = (window as any).PaystackPop;
    if (!paystackPop) {
      setPaymentFeedback({
        text: 'Paystack billing service is currently loading or unavailable. Please check your internet connection.',
        type: 'error'
      });
      return;
    }

    setPaymentFeedback(null);

    try {
      const handler = paystackPop.setup({
        key: 'pk_live_cb34fc247dff6ef14f98fcc664752fee9a2d6ee0',
        email: email.trim(),
        amount: amountKobo,
        currency: 'NGN',
        ref: reference,
        metadata: {
          custom_fields: [
            {
              display_name: "Merchant Name",
              variable_name: "merchant_name",
              value: "CakeWise (Testibites Cakes)"
            },
            {
              display_name: "Plan Type",
              variable_name: "plan_type",
              value: planName
            },
            {
              display_name: "Billing Cycle",
              variable_name: "billing_cycle",
              value: cycle
            }
          ]
        },
        callback: function(response: any) {
          setIsPremiumUser(true);
          setDailyScansLeft(99999);
          setPaymentPlanToCheckout(null);
          setPaymentFeedback({
            text: 'Payment successful! Your plan is now active.',
            type: 'success'
          });
          setShowPricingModal(false);
          setBakerEmail(email.trim());
        },
        onClose: function() {
          setPaymentFeedback({
            text: 'Payment not completed. Please try again.',
            type: 'error'
          });
        }
      });
      handler.openIframe();
    } catch (err) {
      console.error('Paystack initialization error:', err);
      setPaymentFeedback({
        text: 'Could not initialize Paystack inline payment. Please try again.',
        type: 'error'
      });
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('cakewise_is_premium', isPremiumUser.toString());
    } catch (e) {
      console.error('Error saving premium status', e);
    }
  }, [isPremiumUser]);

  useEffect(() => {
    try {
      localStorage.setItem('cakewise_scans_left', dailyScansLeft.toString());
    } catch (e) {
      console.error('Error saving scan limit', e);
    }
  }, [dailyScansLeft]);

  // --- Cost breakdown accordion toggles ---
  const [showDetailedIngredients, setShowDetailedIngredients] = useState<boolean>(false);
  const [showDetailedOthers, setShowDetailedOthers] = useState<boolean>(false);

  // --- Calculations History ---
  const [history, setHistory] = useState<SavedCalculation[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showIngredientsReference, setShowIngredientsReference] = useState<boolean>(false);

  // --- Drag and Drop State ---
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- AI Image Analysis State ---
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<{
    isCakeDetected: boolean;
    detectedDesignElements: string[];
    suggestedComplexity: 'Simple' | 'Moderate' | 'Complex';
    justification: string;
    suggestedTiers: number;
    suggestedFrosting: 'Buttercream' | 'Whipping Cream' | 'Ganache' | 'Fondant';
    estimatedSizes: number[];
    estimatedLayers: number[];
    confidenceNote: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisLoadingStep, setAnalysisLoadingStep] = useState<string>('');

  const analyzeCakeImage = async () => {
    if (!inputs.referenceImage) return;
    
    // Check daily scan limits for non-premium accounts
    if (!isPremiumUser && dailyScansLeft <= 0) {
      setAnalysisError("⚠️ Look like you have used all your complimentary scans for today. See upgraded plans below to get unlimited AI scanning!");
      setShowPricingModal(true);
      return;
    }

    setIsAnalyzingImage(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const loadingSteps = [
      "Uploading cake photo to Cakewise-AI analyser...",
      "Analyzing frosting covering style (Buttercream, Fondant, etc.)...",
      "Counting visible tiers and checking structural alignment...",
      "Inspecting decorative detail density (flowers, pearls, characters)...",
      "Evaluating total baker labor/decorating hours required...",
      "Matching to standard Nigerian baking complexity levels..."
    ];

    let stepIndex = 0;
    setAnalysisLoadingStep(loadingSteps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % loadingSteps.length;
      setAnalysisLoadingStep(loadingSteps[stepIndex]);
    }, 2000);

    try {
      const response = await fetch("/api/analyze-cake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: inputs.referenceImage,
        }),
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${response.status})`);
      }

      const result = await response.json();
      setAnalysisResult(result);

      // Decrement scan token if successful and not premium
      if (!isPremiumUser) {
        setDailyScansLeft(prev => Math.max(0, prev - 1));
      }

      // Automatically adjust form values based on AI's vision metrics
      const isCakeDetected = result.isCakeDetected;
      const isMultiTier = isCakeDetected && result.suggestedTiers > 1;

      setInputs(prev => {
        if (!isCakeDetected) {
          // Fallback logic if no cake is detected or the image is too unclear
          return {
            ...prev,
            useCustomTiers: false,
            numberOfTiers: '',
            cakeSize: '',
            numberOfLayers: '',
            complexityLevel: (result.suggestedComplexity as ComplexityLevel) || 'Simple',
            frostingType: ['Buttercream', 'Whipping Cream', 'Ganache', 'Fondant'].includes(result.suggestedFrosting)
              ? result.suggestedFrosting as FrostingType
              : 'Buttercream',
          };
        }

        if (isMultiTier) {
          const numTiers = (result.suggestedTiers >= 1 && result.suggestedTiers <= 6) ? result.suggestedTiers : 2;
          const customTiersList = Array.from({ length: numTiers }, (_, i) => ({
            size: result.estimatedSizes?.[i] || (10 - i * 2 > 4 ? 10 - i * 2 : 6),
            layers: result.estimatedLayers?.[i] || 2
          }));

          return {
            ...prev,
            useCustomTiers: true,
            numberOfTiers: numTiers,
            customTiers: customTiersList,
            complexityLevel: (result.suggestedComplexity as ComplexityLevel) || 'Simple',
            frostingType: ['Buttercream', 'Whipping Cream', 'Ganache', 'Fondant'].includes(result.suggestedFrosting)
              ? result.suggestedFrosting as FrostingType
              : prev.frostingType,
          };
        } else {
          return {
            ...prev,
            useCustomTiers: false,
            numberOfTiers: 1,
            cakeSize: result.estimatedSizes?.[0] || 8,
            numberOfLayers: result.estimatedLayers?.[0] || 2,
            complexityLevel: (result.suggestedComplexity as ComplexityLevel) || 'Simple',
            frostingType: ['Buttercream', 'Whipping Cream', 'Ganache', 'Fondant'].includes(result.suggestedFrosting)
              ? result.suggestedFrosting as FrostingType
              : prev.frostingType,
          };
        }
      });
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error("AI Image analysis failed:", err);
      setAnalysisError("⚠️ Image analysis is temporarily unavailable due to high demand. Please try again shortly or enter cake details manually below.");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleUpdateAITiers = (newTiers: number) => {
    const val = Math.max(1, Math.min(6, newTiers));
    if (val === 1) {
      setInputs(prev => ({
        ...prev,
        useCustomTiers: false,
        numberOfTiers: 1
      }));
    } else {
      setInputs(prev => {
        let currentList = prev.customTiers || [];
        const newList = [...currentList];
        if (newList.length < val) {
          while (newList.length < val) {
            newList.push({ size: 10 - newList.length * 2 > 4 ? 10 - newList.length * 2 : 6, layers: 2 });
          }
        } else if (newList.length > val) {
          newList.splice(val);
        }
        return {
          ...prev,
          useCustomTiers: true,
          numberOfTiers: val,
          customTiers: newList
        };
      });
    }
  };

  // --- Load history from local storage on mount ---
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error reading from localStorage', e);
    }
  }, []);

  // --- Handle Factory Reset ---
  const handleReset = () => {
    setInputs({
      cakeType: 'Vanilla',
      cakeSize: '',
      complexityLevel: 'Simple',
      frostingType: 'Buttercream',
      numberOfTiers: '',
      numberOfLayers: '',
      deliveryCost: 0,
      profitMargin: 1.15,
      referenceImage: '',
      referenceImageName: '',
      useCustomTiers: false,
      customTiers: [],
      businessLevel: 'Growing',
    });
    setOrderName('');
    setManualPriceOverride('');
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const resetSession = () => {
    try {
      localStorage.removeItem('cakewise_active_inputs');
    } catch (e) {
      console.error(e);
    }
    handleReset();
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('cakewise_session_started');
      localStorage.removeItem('cakewise_baker_name');
      localStorage.removeItem('cakewise_baker_email');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem('cakewise_is_premium');
      localStorage.removeItem('cakewise_scans_left');
      localStorage.removeItem('cakewise_active_inputs');
    } catch (e) {
      console.error(e);
    }
    
    setBakerName('');
    setBakerEmail('');
    setSessionStarted(false);
    setIsPremiumUser(false);
    setDailyScansLeft(3);
    setHistory([]);
    handleReset();
  };

  // --- Save history helper ---
  const saveToLocalStorage = (newHistory: SavedCalculation[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  };

  // --- Run core calculation ---
  const isEmpty = !inputs.useCustomTiers
    ? (inputs.cakeSize === '' || inputs.cakeSize === 0 || inputs.numberOfLayers === '' || inputs.numberOfLayers === 0 || inputs.numberOfTiers === '' || inputs.numberOfTiers === 0)
    : (inputs.numberOfTiers === '' || inputs.numberOfTiers === 0 || !inputs.customTiers || inputs.customTiers.length === 0 || inputs.customTiers.some(t => t.size === '' || t.size === 0 || t.layers === '' || t.layers === 0));

  const results = calculateCakePrice(inputs);

  // --- Derivations for manual price override ---
  const parsedOverride = parseFloat(manualPriceOverride);
  const isOverridden = !isNaN(parsedOverride) && parsedOverride > 0;
  const activePrice = isOverridden ? parsedOverride : results.suggestedSellingPrice;
  const activeProfit = activePrice - results.totalCost;
  const activeMargin = activePrice > 0 ? (activeProfit / activePrice) * 105 : 0; // standard margin %
  const activeMarkup = results.totalCost > 0 ? (activeProfit / results.totalCost) * 100 : 0; // standard markup %

  // --- Handler Helper to Update Numeric Fields ---
  const handleNumChange = (field: keyof CakeInputs, value: number | '', min = 0) => {
    setInputs(prev => ({
      ...prev,
      [field]: value === '' ? '' : Math.max(min, isNaN(value) ? min : value)
    }));
  };

  // --- Handle Custom Independent Tiers Operations ---
  const toggleCustomTiers = () => {
    setInputs(prev => {
      const active = !prev.useCustomTiers;
      let tiersList = prev.customTiers || [];
      if (active && tiersList.length === 0) {
        tiersList = [];
        const baseSize = prev.cakeSize;
        const baseLayers = prev.numberOfLayers;
        const count = prev.numberOfTiers;
        for (let i = 0; i < count; i++) {
          const size = Math.max(4, baseSize + (count - 1 - i) * 2);
          tiersList.push({ size, layers: baseLayers });
        }
      }
      return {
        ...prev,
        useCustomTiers: active,
        customTiers: tiersList,
        numberOfTiers: active ? tiersList.length : prev.numberOfTiers
      };
    });
  };

  const handleAddTier = () => {
    setInputs(prev => {
      const currentList = prev.customTiers || [];
      const bottomSize = currentList.length > 0 ? currentList[currentList.length - 1].size : 10;
      const newSize = Math.max(4, bottomSize - 2);
      const newList = [...currentList, { size: newSize, layers: 3 }];
      return {
        ...prev,
        customTiers: newList,
        numberOfTiers: newList.length
      };
    });
  };

  const handleRemoveTier = (index: number) => {
    setInputs(prev => {
      const currentList = prev.customTiers || [];
      const newList = currentList.filter((_, idx) => idx !== index);
      return {
        ...prev,
        customTiers: newList,
        numberOfTiers: newList.length
      };
    });
  };

  const handleUpdateTier = (index: number, field: 'size' | 'layers', value: number | '') => {
    setInputs(prev => {
      const currentList = prev.customTiers || [];
      const newList = currentList.map((tier, idx) => {
        if (idx === index) {
          return {
            ...tier,
            [field]: value === '' ? '' : Math.max(1, value)
          };
        }
        return tier;
      });
      return {
        ...prev,
        customTiers: newList
      };
    });
  };

  const handleLayerFlavorChange = (tierIndex: number, layerIndex: number, flavor: CakeType) => {
    setInputs(prev => {
      const updated = prev.layerFlavors ? [...prev.layerFlavors] : [];
      while (updated.length <= tierIndex) {
        updated.push([]);
      }
      updated[tierIndex] = [...(updated[tierIndex] || [])];
      for (let i = 0; i <= layerIndex; i++) {
        if (!updated[tierIndex][i]) {
          updated[tierIndex][i] = 'Vanilla';
        }
      }
      updated[tierIndex][layerIndex] = flavor;
      return {
        ...prev,
        layerFlavors: updated
      };
    });
  };

  // --- Handle Quick Presets ---
  const applyPresetSize = (size: number) => {
    setInputs(prev => ({ ...prev, cakeSize: size }));
  };

  const applyPresetTiers = (tiersCount: number) => {
    setInputs(prev => {
      if (prev.useCustomTiers) {
        const currentList = prev.customTiers || [];
        if (currentList.length < tiersCount) {
          const newList = [...currentList];
          while (newList.length < tiersCount) {
            const lastSize = newList.length > 0 ? newList[newList.length - 1].size : 10;
            const newSize = Math.max(4, lastSize - 2);
            newList.push({ size: newSize, layers: 3 });
          }
          return { ...prev, customTiers: newList, numberOfTiers: tiersCount };
        } else if (currentList.length > tiersCount) {
          const newList = currentList.slice(0, tiersCount);
          return { ...prev, customTiers: newList, numberOfTiers: tiersCount };
        }
      }
      return { ...prev, numberOfTiers: tiersCount };
    });
  };

  const applyStandardEstimate = () => {
    setInputs(prev => ({
      ...prev,
      useCustomTiers: false,
      numberOfTiers: 1,
      cakeSize: 8,
      numberOfLayers: 2,
    }));
  };

  const applyPresetMargin = (margin: number) => {
    setInputs(prev => ({ ...prev, profitMargin: margin }));
  };

  const applyPresetDelivery = (cost: number) => {
    setInputs(prev => ({ ...prev, deliveryCost: cost }));
  };

  const applyCustomTierStack = (stack: { size: number; layers: number }[]) => {
    setInputs(prev => ({
      ...prev,
      useCustomTiers: true,
      customTiers: stack,
      numberOfTiers: stack.length
    }));
  };

  // --- Handle Custom Image Upload ---
  const handleImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInputs(prev => ({
        ...prev,
        referenceImage: reader.result as string,
        referenceImageName: file.name
      }));
      setAnalysisResult(null);
      setAnalysisError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  const removeReferenceImage = () => {
    setInputs(prev => ({
      ...prev,
      referenceImage: '',
      referenceImageName: ''
    }));
    setAnalysisResult(null);
    setAnalysisError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // --- Handle Save to History ---
  const handleSaveCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    const finalOrderName = orderName.trim() || `Cake Request (${inputs.cakeType} ${inputs.cakeSize}")`;
    
    const savedResult = { ...results };
    if (isOverridden) {
      savedResult.suggestedSellingPrice = activePrice;
      savedResult.suggestedMinPrice = activePrice;
      savedResult.suggestedMaxPrice = activePrice;
      savedResult.estimatedProfit = activeProfit;
    }

    const newSavedItem: SavedCalculation = {
      id: Date.now().toString(),
      name: finalOrderName,
      date: new Date().toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      inputs: { ...inputs },
      result: savedResult
    };

    const updatedHistory = [newSavedItem, ...history];
    saveToLocalStorage(updatedHistory);
    
    // Clear/Reset save flow state
    setOrderName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // --- Handle Load from History ---
  const handleLoadCalculation = (item: SavedCalculation) => {
    setInputs({ ...item.inputs });
    // If the saved suggested retail price differs from what standard calculation outputs, restore override
    const calculatedTemp = calculateCakePrice(item.inputs);
    if (item.result.suggestedSellingPrice !== calculatedTemp.suggestedSellingPrice) {
      setManualPriceOverride(item.result.suggestedSellingPrice.toString());
    } else {
      setManualPriceOverride('');
    }
    setLoadedSuccess(`Loaded calculation for "${item.name}"`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setLoadedSuccess(''), 3000);
  };

  // --- Handle Delete from History ---
  const handleDeleteCalculation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid loading when clicking delete
    const filtered = history.filter(item => item.id !== id);
    saveToLocalStorage(filtered);
  };

  // --- Confidence Indicator Derivations ---
  let confidenceStatus: 'fair' | 'high' | 'too_expensive' = 'fair';
  let confidenceColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
  let confidenceLabel = '🟢 Fair Price';
  let confidenceDesc = 'This price is perfectly aligned with the standard Nigerian market rate for these exact specs.';

  if (activePrice > results.expectedMax) {
    if (activePrice <= results.expectedMax * 1.2) {
      confidenceStatus = 'high';
      confidenceColor = 'text-amber-400 bg-amber-950/40 border-amber-800/40';
      confidenceLabel = '🟡 Slightly High';
      confidenceDesc = 'This price sits slightly above the expected market range. Be prepared to justify your premium craft details to clients.';
    } else {
      confidenceStatus = 'too_expensive';
      confidenceColor = 'text-red-400 bg-red-950/40 border-red-800/40';
      confidenceLabel = '🔴 Too Expensive';
      confidenceDesc = 'Warning: This price exceeds competitive market boundaries by a wide margin. Customers might consider it too expensive.';
    }
  } else if (activePrice < results.expectedMin) {
    confidenceStatus = 'fair';
    confidenceColor = 'text-sky-400 bg-sky-950/40 border-sky-850/40';
    confidenceLabel = '🟢 Great Value / Low Margin';
    confidenceDesc = 'This price sits below standard local market rate ranges. Ensure you have calculated enough markup to cover your intensive effort!';
  }

  // --- Confidence + Reasoning Helper per pricing option ---
  const getTierConfidenceInfo = (tier: 'Budget' | 'Standard' | 'Premium') => {
    const size = inputs.cakeSize;
    const layers = inputs.numberOfLayers;
    const complexity = inputs.complexityLevel;
    const isCustom = inputs.useCustomTiers;
    const bizLevel = inputs.businessLevel || 'Growing';

    let confidence: 'High' | 'Medium' | 'Low' = 'High';
    let reason = '';

    if (tier === 'Budget') {
      if (bizLevel === 'Premium') {
        confidence = 'Low';
        reason = `Sits well below standard premium brand overheads. Highly attractive for clients, but we advise caution as it may undervalue your luxury artisanship.`;
      } else if (bizLevel === 'Growing') {
        confidence = 'Medium';
        reason = `Comfortable discount tier that appeals to value-focused cake shoppers. Perfect for building initial volume, although margins are narrow.`;
      } else {
        confidence = 'High';
        reason = `Highly compatible range for early-career bakers. Fully covers local baking ingredients, matches beginner margins, and helps you win sales.`;
      }
    } else if (tier === 'Standard') {
      confidence = 'High';
      reason = `Matches current competitive average market rates in Nigeria for custom ${isCustom ? 'stacked' : `${size}-inch`} cakes. Assures standard business margins.`;
    } else {
      if (bizLevel === 'Beginner') {
        confidence = 'Medium';
        reason = `A high margin objective for beginners. Delivers awesome profit but requires superb finishing and piping execution to justify to consumers.`;
      } else if (bizLevel === 'Growing') {
        confidence = 'High';
        reason = `Excellent target quote for growing bakeries facing higher complexity orders. Safely covers specialized structural materials, gold elements, or labor hours.`;
      } else {
        confidence = 'High';
        reason = `Perfect alignment for standard premium-brand orders. Fully covers boutique craftsmanship, luxury ingredient markups, and master baker labor.`;
      }
    }

    return { confidence, reason };
  };

  // --- Calculations Utility Formatter ---
  const formatNaira = (value: number) => {
    return '₦' + Math.round(value).toLocaleString('en-NG');
  };

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-[#FFF7F5] flex items-stretch overflow-hidden font-sans" id="welcome_screen_container">
        {/* Left column - Visual / Branding side (Desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#6B1E57] text-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#FF6FA7]/20 to-transparent blur-3xl"></div>
          
          {/* Brand header */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-[#FF6FA7] p-2.5 rounded-2xl shadow-md">
              <Cake className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xl font-bold tracking-tight leading-none">CakeWise</span>
              <span className="text-[10px] text-pink-200/80 font-medium mt-0.5">by Testibites Cakes N’ Pastries</span>
            </div>
          </div>

          {/* Core content */}
          <div className="my-auto space-y-8 relative z-10 flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl scale-110"></div>
              <img
                src="/src/assets/images/pink_cake_onboarding_1783184335505.jpg"
                alt="CakeWise Cake Illustration"
                referrerPolicy="no-referrer"
                className="w-72 h-72 object-cover rounded-3xl shadow-2xl border-4 border-[#FF6FA7]/20 mx-auto transform hover:scale-105 transition-transform duration-300 animate-fade-in"
              />
            </div>
            
            <div className="space-y-3 max-w-md">
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
                Let's price <span className="text-[#FF6FA7]">smarter</span>, together.
              </h2>
              <p className="text-sm text-pink-100/80 leading-relaxed font-normal">
                Get accurate pricing, protect your profit margins, and grow your baking business in Nigeria.
              </p>
            </div>

            {/* Slide indicator dots */}
            <div className="flex gap-2 justify-center">
              <span className="w-6 h-1.5 rounded-full bg-[#FF6FA7]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
            </div>
          </div>

          {/* Footer branding */}
          <div className="text-xs text-pink-200/50 relative z-10">
            © 2026 CakeWise by Testibites • Premium Baker Assistant
          </div>
        </div>

        {/* Right column - Form side (Mobile & Desktop) */}
        <div className="w-full lg:w-1/2 bg-[#FFF7F5] flex items-center justify-center p-6 md:p-12 overflow-y-auto">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-pink-100" id="welcome_card">
            
            {/* Header branding for mobile */}
            <div className="text-center space-y-3">
              <div className="lg:hidden relative mx-auto w-40 h-40">
                <img
                  src="/src/assets/images/pink_cake_onboarding_1783184335505.jpg"
                  alt="CakeWise Cake Illustration"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-2xl shadow-md border border-pink-100"
                />
              </div>
              
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 bg-[#FFE6F0] px-3 py-1 rounded-full text-xs font-bold text-[#6B1E57]">
                  🧁 Welcome to CakeWise
                </div>
                <h3 className="text-2xl font-black text-[#6B1E57] tracking-tight">
                  Your AI assistant for smarter cake pricing.
                </h3>
                <p className="text-xs text-slate-400 font-semibold tracking-wide">by Testibites Cakes N’ Pastries</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-5">
              <div className="space-y-1.5 text-left">
                <label htmlFor="bakerNameInput" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#FF6FA7]" /> Baker / Business Name
                </label>
                <input
                  id="bakerNameInput"
                  type="text"
                  placeholder="e.g. Joy’s Confectioneries or Amaka Cakes"
                  value={bakerName}
                  onChange={(e) => setBakerName(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 hover:border-pink-200 focus:border-[#FF6FA7] px-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label htmlFor="bakerEmailInput" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#FF6FA7]" /> Account Email
                </label>
                <input
                  id="bakerEmailInput"
                  type="email"
                  placeholder="e.g. agohachiamaka06@gmail.com"
                  value={bakerEmail}
                  onChange={(e) => setBakerEmail(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 hover:border-pink-200 focus:border-[#FF6FA7] px-4 py-3 rounded-xl focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Choose Business Level */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  🧑‍🍳 Select Your Business Tier / Level
                </label>
                <div className="grid grid-cols-1 gap-2.5" id="welcomeBusinessLevel">
                  {[
                    { value: 'Beginner', title: 'Beginner Baker', desc: 'Home baker, simple cakes, tight budgets' },
                    { value: 'Growing', title: 'Growing Business', desc: 'Regular customers, custom work, scaling up' },
                    { value: 'Premium', title: 'Premium / Luxury Baker', desc: 'Luxury tiers, wedding cakes, elite branding' }
                  ].map((tier) => {
                    const isActive = inputs.businessLevel === tier.value;
                    return (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setInputs(prev => ({ ...prev, businessLevel: tier.value as any }))}
                        className={`text-left border rounded-xl p-3.5 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between hover:shadow-sm ${
                          isActive
                            ? 'border-[#FF6FA7] bg-[#FFE6F0]/40 text-[#6B1E57] shadow-sm ring-1 ring-[#FF6FA7]'
                            : 'border-slate-200 hover:border-pink-200 bg-white text-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs">{tier.title}</p>
                          <p className="text-[10px] text-slate-500 leading-normal">{tier.desc}</p>
                        </div>
                        {isActive ? (
                          <div className="w-5 h-5 rounded-full bg-[#FF6FA7] flex items-center justify-center text-white shrink-0 shadow-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300 shrink-0"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-pink-50/80 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSessionStarted(true);
                  }}
                  className="w-full bg-[#FF6FA7] hover:bg-[#ff5697] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer text-sm"
                  id="welcome-continue-btn"
                >
                  🚀 Launch CakeWise Dashboard <ArrowRight className="w-4 h-4" />
                </button>
                
                <span className="text-[10px] text-slate-400 mt-4 leading-relaxed block text-center">
                  💡 By entering, you calibrate the underlying Nigerian market multipliers and overhead templates to match your chosen experience standard. You can adjust all parameters inside the dashboard.
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased" id="main_root">
      {/* Top professional banner with Nigeria green & white subtle touch */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10" id="app_header">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-sm" id="logo_container">
              <Cake className="w-6 h-6" id="logo_icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none" id="app_title">CakeWise</h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Nigeria MVP
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500/90 mt-0.5">by Testibites Cakes N’ Pastries</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Quick, profitable custom cake quotes for Nigerian micro-bakers</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfileModal(true)}
              className="text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-150 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              id="profile_toggle_btn"
            >
              <User className="w-3.5 h-3.5 text-pink-500" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => setShowIngredientsReference(!showIngredientsReference)}
              className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              id="ingredients_toggle_btn"
            >
              <Info className="w-3.5 h-3.5" />
              {showIngredientsReference ? 'Hide Base Costs' : 'View Base Costs'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-medium text-slate-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 relative"
              id="history_toggle_btn"
            >
              <History className="w-3.5 h-3.5 text-yellow-600" />
              <span>Saved Quotes</span>
              {history.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
            <button
              onClick={resetSession}
              className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              id="reset_session_btn"
              title="Clear active specifications and analysis"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600 animate-spin-hover" />
              Reset Session
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              id="logout_btn"
              title="Log out of CakeWise"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-600" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8" id="application_main">
        {/* Banner for loaded/saved feedback */}
        <AnimatePresence>
          {loadedSuccess && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 mb-4 rounded-xl text-sm flex items-center gap-2 font-medium"
              id="load_success_banner"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600 inline-shrink" />
              <span>{loadedSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Welcome Area */}
        <div className="mb-8 space-y-6" id="dashboard_welcome_area">
          {/* Greeting Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-pink-100 shadow-sm text-left">
            <div>
              <h2 className="text-2xl font-black text-[#6B1E57] flex items-center gap-2">
                Hello, {bakerName || "Chiamaka"} 👋
              </h2>
              <p className="text-sm text-slate-500 font-medium">Let's grow your baking business today.</p>
            </div>
            
            {/* Active Plan Card */}
            <div className="bg-gradient-to-r from-[#FFE6F0] to-[#FFF7F5] border border-pink-150 p-4 rounded-2xl flex items-center justify-between gap-6 shrink-0 md:min-w-[320px] text-left">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#FF6FA7]">Current Plan</span>
                  <span className="bg-[#28C76F] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <h4 className="text-base font-black text-[#6B1E57] mt-1">{isPremiumUser ? "CakeWise Premium" : "Free Sandbox"}</h4>
                <p className="text-[10.5px] text-slate-400 font-medium">Renews on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 28).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPricingModal(true)}
                className="bg-white hover:bg-pink-50 text-[#FF6FA7] border border-pink-200 text-xs font-bold py-2 px-3.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                View Plans
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => {
                const element = document.getElementById("image_drag_zone");
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Flash the zone border for emphasis
                  element.classList.add("ring-4", "ring-[#FF6FA7]/30");
                  setTimeout(() => element.classList.remove("ring-4", "ring-[#FF6FA7]/30"), 1500);
                }
              }}
              className="bg-white border border-pink-50 hover:border-pink-200 p-5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition-all shadow-2xs hover:shadow-sm cursor-pointer group"
            >
              <div className="bg-[#FFE6F0] text-[#FF6FA7] p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-black text-[#6B1E57] text-xs md:text-sm">Scan Cake</p>
                <p className="text-[10px] text-slate-400 font-medium">Get pricing instantly</p>
              </div>
            </button>

            <button
              onClick={() => setShowHistory(true)}
              className="bg-white border border-pink-50 hover:border-pink-200 p-5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition-all shadow-2xs hover:shadow-sm cursor-pointer group"
            >
              <div className="bg-[#FFE6F0] text-[#FF6FA7] p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <History className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-black text-[#6B1E57] text-xs md:text-sm">My Scans</p>
                <p className="text-[10px] text-slate-400 font-medium">View saved history</p>
              </div>
            </button>

            <button
              onClick={() => {
                const element = document.getElementById("calculator_grid");
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="bg-white border border-pink-50 hover:border-pink-200 p-5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition-all shadow-2xs hover:shadow-sm cursor-pointer group"
            >
              <div className="bg-[#FFE6F0] text-[#FF6FA7] p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <Calculator className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-black text-[#6B1E57] text-xs md:text-sm">Profit Calculator</p>
                <p className="text-[10px] text-slate-400 font-medium">Plan specifications</p>
              </div>
            </button>

            <button
              onClick={() => setShowPricingModal(true)}
              className="bg-white border border-pink-50 hover:border-pink-200 p-5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition-all shadow-2xs hover:shadow-sm cursor-pointer group"
            >
              <div className="bg-[#FFE6F0] text-[#FF6FA7] p-3 rounded-2xl group-hover:scale-110 transition-transform animate-pulse">
                <Crown className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-center">
                <p className="font-black text-[#6B1E57] text-xs md:text-sm">Upgrade Plan</p>
                <p className="text-[10px] text-slate-400 font-medium">Unlock premium</p>
              </div>
            </button>
          </div>

          {/* Recent Scans and Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Box: Simple Quick Summary */}
            <div className="md:col-span-4 bg-gradient-to-br from-[#6B1E57] to-[#4A113B] p-6 rounded-3xl text-white flex flex-col justify-between shadow-sm relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6FA7]/10 rounded-full blur-xl"></div>
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#FF6FA7]">Business Performance</span>
                <h4 className="text-lg font-black leading-tight">Your Baker Insights</h4>
                <p className="text-xs text-pink-100/70 font-normal leading-relaxed">Track your pricing confidence and margin targets across Nigeria.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6 relative z-10 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] text-pink-200 font-semibold uppercase">Total Saved</p>
                  <p className="text-lg font-black">{history.length} Quotes</p>
                </div>
                <div>
                  <p className="text-[10px] text-pink-200 font-semibold uppercase font-mono">Scans Left</p>
                  <p className="text-lg font-black">{isPremiumUser ? "Unlimited" : `${dailyScansLeft} Scans`}</p>
                </div>
              </div>
            </div>

            {/* Right Box: Recent Scans list */}
            <div className="md:col-span-8 bg-white border border-pink-50 p-6 rounded-3xl shadow-sm flex flex-col justify-between text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                <h3 className="text-sm font-black text-[#6B1E57] flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#FF6FA7]" />
                  Recent Calculations
                </h3>
                {history.length > 0 && (
                  <button 
                    onClick={() => setShowHistory(true)}
                    className="text-xs font-bold text-[#FF6FA7] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    See all <ArrowRight className="w-3" />
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium space-y-2 flex-1 flex flex-col justify-center">
                  <p>✨ No recent calculations yet.</p>
                  <p className="text-[10px] text-slate-400">Scan a cake photo or enter specs to save your first smart quote!</p>
                </div>
              ) : (
                <div className="space-y-3 mt-4 flex-1 overflow-y-auto max-h-[160px] scrollbar-thin">
                  {history.slice(0, 3).map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        // Load item from history
                        setInputs(item.inputs);
                        if (item.name) setOrderName(item.name);
                        setLoadedSuccess(`Successfully loaded quote "${item.name || `Quote #${item.id.slice(0, 4)}`}"!`);
                        setTimeout(() => setLoadedSuccess(null), 4000);
                        const element = document.getElementById("calculator_grid");
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-pink-100 bg-slate-50/50 hover:bg-[#FFE6F0]/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {item.inputs.referenceImage ? (
                          <img 
                            src={item.inputs.referenceImage} 
                            alt={item.name} 
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-[#FFE6F0] rounded-lg flex items-center justify-center text-sm">
                            🎂
                          </div>
                        )}
                        <div className="text-left">
                          <p className="text-xs font-black text-slate-800 truncate max-w-[150px] sm:max-w-[240px]">{item.name || `Quote #${item.id.slice(0, 4)}`}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(item.timestamp).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} • {item.inputs.cakeType} ({item.inputs.cakeSize}&quot;)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-[#FF6FA7]">₦{(item.results?.sellingPrice || 0).toLocaleString('en-NG')}</p>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100 font-bold">
                          {(item.results?.profitMarginPercent || 0).toFixed(0)}% Margin
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ingredients Costs Drawer Reference (₦ / unit) */}
        <AnimatePresence>
          {showIngredientsReference && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm overflow-hidden"
              id="ingredients_reference_panel"
            >
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                Nigeria Standard Ingredient Costs &amp; Base Recipe Parameters
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2.5 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Flour</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.flour.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Sugar</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.sugar.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Margarine</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.margarine.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Eggs</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.eggs.toFixed(0)} / unit</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Cocoa</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.cocoa.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Milk</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.milk.toFixed(2)} / ml</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Oil</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.oil.toFixed(2)} / ml</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Baking Powder</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.bakingPowder.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Flavouring</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.flavouring.toFixed(2)} / ml</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Icing Sugar</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.icingSugar.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Buttercream Fat</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.buttercreamMargarine.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Whip Cream Pwd</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.whippingCreamPowder.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Chocolate Slab</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.chocolateSlabs.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Liquid Cream</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.liquidCream.toFixed(2)} / ml</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Fondant</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.fondant.toFixed(2)} / g</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block font-medium">Carton / Board</span>
                  <span className="font-bold text-slate-900">₦{INGREDIENT_UNIT_COSTS.packaging.toLocaleString('en-NG')}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 flex flex-col gap-2.5 text-[11px] text-slate-500">
                <p>💡 <b>Pro-Tip:</b> Size scaling uses standard circular cake panning area rules: <code>(Diameter ÷ 8)²</code>. Base recipe is defined per layer for an 8&quot; cake and scales with layers &amp; tiers.</p>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                  <span>🔴 <b>Red Velvet (Per Layer):</b> Flour 250g, Sugar 200g, Margarine 250g, Eggs 5, Cocoa 20g, Milk 100ml, Oil 60ml, Minor/Icing BP 10g, Flavour 15ml, Icing Sug 250g, Buttercream Fat 150g</span>
                  <span>🟡 <b>Vanilla (Per Layer):</b> Flour 250g, Sugar 200g, Margarine 250g, Eggs 5, Milk 100ml, Oil 50ml, Minor/Icing BP 10g, Flavour 15ml, Icing Sug 250g, Buttercream Fat 150g</span>
                  <span>🟤 <b>Chocolate (Per Layer):</b> Flour 250g, Sugar 200g, Margarine 250g, Eggs 5, Cocoa 35g, Milk 110ml, Oil 50ml, Minor/Icing BP 10g, Flavour 15ml, Icing Sug 250g, Buttercream Fat 150g</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="calculator_grid">
          {/* Active Calculator Column */}
          <div className="lg:col-span-7 flex flex-col gap-6" id="calculator_inputs_column">
            
            {/* INPUT CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cake className="w-5 h-5 text-emerald-600" />
                  Cake specifications
                </h2>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                  id="reset_form_button"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Inputs
                </button>
              </div>

              {history.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-indigo-950 transition-all shadow-xs" id="reuse_last_specs_banner">
                  <div className="flex items-center gap-2 text-left">
                    <span className="text-base">🔄</span>
                    <div>
                      <p className="font-bold text-indigo-900">Reuse last cake details?</p>
                      <p className="text-[10px] text-indigo-700/85">
                        Import setup from <b>&quot;{history[0].name || `Quote #${history[0].id.slice(0, 4)}`}&quot;</b>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInputs({
                        ...history[0].inputs,
                        businessLevel: history[0].inputs.businessLevel || inputs.businessLevel || 'Growing'
                      });
                      if (history[0].name) {
                        setOrderName(history[0].name);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-750 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                  >
                    Quick Load
                  </button>
                </div>
              )}

              {/* SPEC FIELDS GROUP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. CAKE TYPE */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cakeType" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    Cake Flavor/Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="cakeType"
                    value={inputs.cakeType}
                    onChange={(e) => setInputs(prev => ({ ...prev, cakeType: e.target.value as CakeType }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all font-medium"
                  >
                    <option value="Vanilla">Vanilla (Standard Base)</option>
                    <option value="Red Velvet">Red Velvet (Premium Velvet)</option>
                    <option value="Chocolate">Chocolate (Rich Dutch Cocoa)</option>
                    <option value="Fruit Cake">Fruit Cake (Rich Soaked Dried Fruits & Rum)</option>
                    <option value="Combo">Combo (Mix & Match Layer Flavors)</option>
                  </select>
                </div>

                {/* 1.b COMBO LAYER CONFIGURATOR */}
                {inputs.cakeType === 'Combo' && (
                  <div className="col-span-1 md:col-span-2 border border-blue-100 bg-blue-50/20 rounded-2xl p-4.5 animate-fade-in flex flex-col gap-4 shadow-3xs">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xs font-bold text-blue-950 flex items-center gap-2">
                        <span>🧁</span> Combo Layer Flavor Configurator
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Map out individual flavors for each stacked layer (built from physical bottom to top of each tier).
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {(() => {
                        const tiersList = inputs.useCustomTiers && inputs.customTiers && inputs.customTiers.length > 0
                          ? inputs.customTiers
                          : Array.from({ length: inputs.numberOfTiers }, (_, i) => ({
                              size: inputs.cakeSize,
                              layers: inputs.numberOfLayers,
                            }));

                        return [...tiersList].reverse().map((tier, revIndex) => {
                          const index = tiersList.length - 1 - revIndex;
                          const tierName = index === 0 
                            ? 'Bottom Tier (Base)' 
                            : index === tiersList.length - 1 
                              ? 'Top Tier' 
                              : `Middle Tier ${index + 1}`;

                          return (
                            <div key={index} className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs flex flex-col gap-3">
                              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold">
                                    Tier {index + 1}
                                  </span>
                                  {tierName} ({tier.size}&quot;)
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {tier.layers} Layers
                                </span>
                              </div>

                              <div className="flex flex-col gap-2">
                                {Array.from({ length: tier.layers }, (_, lIdx) => {
                                  const layerIndex = tier.layers - 1 - lIdx; // Visual top-to-bottom stack order
                                  const currentFlavor = (inputs.layerFlavors?.[index]?.[layerIndex]) || 'Vanilla';
                                  
                                  return (
                                    <div 
                                      key={layerIndex} 
                                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-50/70 rounded-lg border border-slate-100"
                                    >
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-mono text-[9px] font-bold text-blue-700">
                                          L{layerIndex + 1}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-600">
                                          Layer {layerIndex + 1} {layerIndex === tier.layers - 1 ? '(Top)' : layerIndex === 0 ? '(Bottom)' : ''}
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap gap-1">
                                        {(['Vanilla', 'Chocolate', 'Red Velvet', 'Fruit Cake'] as Exclude<CakeType, 'Combo'>[]).map((flv) => {
                                          const isSel = currentFlavor === flv;
                                          const flvColors: Record<Exclude<CakeType, 'Combo'>, string> = {
                                            'Vanilla': 'border-amber-300 bg-amber-50 text-amber-800 ring-amber-500/10',
                                            'Chocolate': 'border-amber-900/30 bg-orange-950/5 text-amber-950 ring-amber-950/10',
                                            'Red Velvet': 'border-red-300 bg-red-50 text-red-900 ring-red-500/10',
                                            'Fruit Cake': 'border-emerald-300 bg-emerald-50 text-emerald-900 ring-emerald-500/10',
                                          };
                                          
                                          return (
                                            <button
                                              key={flv}
                                              type="button"
                                              onClick={() => handleLayerFlavorChange(index, layerIndex, flv)}
                                              className={`text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                                                isSel 
                                                  ? `${flvColors[flv]} ring-2 font-bold` 
                                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
                                              }`}
                                            >
                                              {flv}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* 2. COMPLEXITY LEVEL */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="complexityLevel" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    Design Complexity <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="complexityLevel"
                    value={inputs.complexityLevel}
                    onChange={(e) => setInputs(prev => ({ ...prev, complexityLevel: e.target.value as ComplexityLevel }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all font-medium"
                  >
                    <option value="Simple">Simple (Multiplier 1.0, ₦0 Extra)</option>
                    <option value="Moderate">Moderate (Multiplier 1.3, ₦3,000 Extra)</option>
                    <option value="Complex">Complex (Multiplier 1.6, ₦7,000 Extra)</option>
                  </select>
                </div>

                {/* 2.a YOUR BUSINESS LEVEL (PERSONALIZATION) */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="businessLevel" className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    🧑‍🍳 Your Business Level
                    <span className="text-[10px] text-slate-400 font-normal">(Personalizes recommendation)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5" id="business_level_group">
                    {[
                      { value: 'Beginner', label: 'Beginner', desc: 'Focus on Volume' },
                      { value: 'Growing', label: 'Growing', desc: 'Market Standard' },
                      { value: 'Premium', label: 'Premium', desc: 'Luxury Artisan' }
                    ].map((level) => {
                      const isActive = (inputs.businessLevel || 'Growing') === level.value;
                      return (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => setInputs(prev => ({ ...prev, businessLevel: level.value as any }))}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                            isActive
                              ? 'border-indigo-600 bg-indigo-50/70 text-indigo-800 ring-2 ring-indigo-500/10'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-xs font-bold leading-none">{level.label}</span>
                          <span className="text-[8px] text-slate-400 mt-1 leading-none">{level.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2.b FROSTING/COVERING TYPE */}
                <div className="col-span-1 md:col-span-2 flex flex-col gap-2 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                  <div className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-xs">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      🖌️ Cake Frosting &amp; Cover Type <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                       {inputs.frostingType || 'Buttercream'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Different frostings require totally different premium ingredients (e.g., icing sugar, whipping cream powder, chocolate slabs, or imported fondant) which directly affect the material cost of the tier.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                    {[
                      { type: 'Buttercream', label: 'Buttercream', desc: 'Standard Rich Frosting', activeStyle: 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/10' },
                      { type: 'Whipping Cream', label: 'Whipping Cream', desc: 'Light & Fluffy Cream', activeStyle: 'border-cyan-600 bg-cyan-50 text-cyan-800 ring-2 ring-cyan-500/10' },
                      { type: 'Ganache', label: 'Chocolate Ganache', desc: 'Glazed Slab & Cream', activeStyle: 'border-amber-700 bg-amber-50 text-amber-900 ring-2 ring-amber-500/10' },
                      { type: 'Fondant', label: 'Rolled Fondant', desc: 'Durable Sculpted Icing', activeStyle: 'border-fuchsia-600 bg-fuchsia-50 text-fuchsia-800 ring-2 ring-fuchsia-500/10' },
                    ].map((item) => {
                      const isActive = (inputs.frostingType || 'Buttercream') === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          id={`frosting_${item.type.toLowerCase().replace(' ', '_')}`}
                          onClick={() => setInputs(prev => ({ ...prev, frostingType: item.type as FrostingType }))}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none h-full ${
                            isActive
                              ? item.activeStyle
                              : 'border-slate-200 bg-white hover:bg-slate-50/80 text-slate-700'
                          }`}
                        >
                          <span className="text-xs font-bold font-sans">{item.label}</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ADVANCED MULTI-TIER TOGGLE */}
                <div className="col-span-1 md:col-span-2 bg-emerald-50/50 hover:bg-emerald-50/80 border border-emerald-100 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                        <Layers className="w-4 h-4" />
                      </span>
                      Advanced Multi-Size Tiers
                    </span>
                    <p className="text-xs text-slate-500 max-w-md mt-1">
                      Configure custom sizes and layers for each individual tier separately (e.g., bottom tier 10&quot; 3 layers, top tier 8&quot; 3 layers).
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-slate-600">
                      {inputs.useCustomTiers ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={toggleCustomTiers}
                      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                        inputs.useCustomTiers ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                      id="custom_tiers_toggle_button"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          inputs.useCustomTiers ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {inputs.useCustomTiers ? (
                  /* CUSTOM INDEPENDENT TIERS PANEL */
                  <div className="col-span-1 md:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        Configure Tiers (Bottom to Top)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddTier}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Tier
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      {(inputs.customTiers || []).map((tier, index) => {
                        const tierName = index === 0 
                          ? 'Bottom Tier (Base)' 
                          : index === (inputs.customTiers?.length || 0) - 1 
                            ? 'Top Tier' 
                            : `Middle Tier ${index + 1}`;
                        return (
                          <div 
                            key={index} 
                            className="bg-white border border-slate-100 shadow-xs rounded-xl p-3.5 flex flex-col gap-3 animate-fade-in"
                          >
                            <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 pb-1.5 font-sans">
                              <span className="text-slate-700 flex items-center gap-1.5">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md text-[10px]">Tier {index + 1}</span>
                                {tierName}
                              </span>
                              {(inputs.customTiers?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTier(index)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                  title="Remove Tier"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Tier Size */}
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-semibold text-slate-500">Size (inches)</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={1}
                                    max={40}
                                    value={tier.size}
                                    onChange={(e) => handleUpdateTier(index, 'size', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full text-center text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5"
                                  />
                                  <span className="text-xs font-semibold text-slate-400">in</span>
                                </div>
                                <div className="flex gap-1 mt-1 justify-center">
                                  {[6, 8, 10, 12].map((sz) => (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => handleUpdateTier(index, 'size', sz)}
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-all ${
                                        tier.size === sz
                                          ? 'bg-slate-800 border-slate-800 text-white'
                                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                      }`}
                                    >
                                      {sz}&quot;
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Tier Layers */}
                              <div className="flex flex-col gap-1">
                                <label className="text-[11px] font-semibold text-slate-500">Layers</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={tier.layers}
                                    onChange={(e) => handleUpdateTier(index, 'layers', e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="w-full text-center text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5"
                                  />
                                  <span className="text-xs font-semibold text-slate-400">layers</span>
                                </div>
                                <div className="flex gap-1 mt-1 justify-center">
                                  {[1, 2, 3, 4, 5, 6].map((l) => (
                                    <button
                                      key={l}
                                      type="button"
                                      onClick={() => handleUpdateTier(index, 'layers', l)}
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition-all ${
                                        tier.layers === l
                                          ? 'bg-slate-800 border-slate-800 text-white'
                                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                      }`}
                                    >
                                      {l}L
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Common Custom Stack Quick Presets */}
                    <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-2.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Quick Custom Stacks:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyCustomTierStack([{ size: 10, layers: 3 }, { size: 8, layers: 3 }])}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                          10&quot; + 8&quot; Tiers (3L each)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyCustomTierStack([{ size: 12, layers: 3 }, { size: 10, layers: 3 }, { size: 8, layers: 3 }])}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                          12&quot; + 10&quot; + 8&quot; Triple
                        </button>
                        <button
                          type="button"
                          onClick={() => applyCustomTierStack([{ size: 8, layers: 3 }, { size: 6, layers: 3 }])}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                          8&quot; + 6&quot; Tiers (3L each)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 3. CAKE SIZE */}
                    <div className="flex flex-col gap-1.5 animate-fade-in">
                      <label htmlFor="cakeSize" className="text-xs font-semibold text-slate-600">
                        Cake Size (inches) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="cakeSize"
                          type="number"
                          required
                          min={1}
                          max={40}
                          step={0.5}
                          value={inputs.cakeSize}
                          onChange={(e) => handleNumChange('cakeSize', e.target.value === '' ? '' : parseFloat(e.target.value), 1)}
                          className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all font-medium inline-block"
                          placeholder="Size in inches"
                        />
                      </div>
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[6, 8, 10, 12, 14].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => applyPresetSize(sz)}
                            className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-all ${
                              inputs.cakeSize === sz
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {sz}&quot; ({((sz / 8) * (sz / 8)).toFixed(2)}x)
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. NUMBER OF TIERS */}
                    <div className="flex flex-col gap-1.5 animate-fade-in">
                      <label htmlFor="numberOfTiers" className="text-xs font-semibold text-slate-600">
                        Number of Tiers <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleNumChange('numberOfTiers', (typeof inputs.numberOfTiers === 'number' ? inputs.numberOfTiers : 1) - 1, 1)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl border border-slate-200 transition-colors"
                          title="Decrease Tiers"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          id="numberOfTiers"
                          type="number"
                          required
                          min={1}
                          max={12}
                          value={inputs.numberOfTiers}
                          onChange={(e) => handleNumChange('numberOfTiers', e.target.value === '' ? '' : parseInt(e.target.value), 1)}
                          className="w-full text-center text-sm bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => handleNumChange('numberOfTiers', (typeof inputs.numberOfTiers === 'number' ? inputs.numberOfTiers : 0) + 1, 1)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl border border-slate-200 transition-colors"
                          title="Increase Tiers"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Presets */}
                      <div className="flex gap-1.5 mt-1">
                        {[1, 2, 3, 4].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => applyPresetTiers(t)}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all ${
                              inputs.numberOfTiers === t
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {t} {t === 1 ? 'Tier' : 'Tiers'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4.b NUMBER OF LAYERS (Per Tier) */}
                    <div className="flex flex-col gap-1.5 animate-fade-in">
                      <label htmlFor="numberOfLayers" className="text-xs font-semibold text-slate-600 flex justify-between">
                        <span>Number of Layers <span className="text-red-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-normal">Per Tier</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleNumChange('numberOfLayers', (typeof inputs.numberOfLayers === 'number' ? inputs.numberOfLayers : 2) - 1, 1)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl border border-slate-200 transition-colors"
                          title="Decrease Layers"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          id="numberOfLayers"
                          type="number"
                          required
                          min={1}
                          max={10}
                          value={inputs.numberOfLayers}
                          onChange={(e) => handleNumChange('numberOfLayers', e.target.value === '' ? '' : parseInt(e.target.value), 1)}
                          className="w-full text-center text-sm bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => handleNumChange('numberOfLayers', (typeof inputs.numberOfLayers === 'number' ? inputs.numberOfLayers : 0) + 1, 1)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl border border-slate-200 transition-colors"
                          title="Increase Layers"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Presets */}
                      <div className="flex gap-1.5 mt-1">
                        {[1, 2, 3, 4, 5, 6].map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => handleNumChange('numberOfLayers', l, 1)}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all ${
                              inputs.numberOfLayers === l
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {l} {l === 1 ? 'Layer' : 'Layers'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>

              <div className="border-t border-slate-100 my-1"></div>

              {/* CASH FLOW FIELDS GROUP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 5. DELIVERY COST */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="deliveryCost" className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                    <span>Delivery Cost (₦)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Naira</span>
                  </label>
                  <input
                    id="deliveryCost"
                    type="number"
                    min={0}
                    step={500}
                    value={inputs.deliveryCost === 0 ? '' : inputs.deliveryCost}
                    onChange={(e) => handleNumChange('deliveryCost', parseFloat(e.target.value), 0)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all font-medium"
                    placeholder="Enter delivery fee (₦0 if pickup)"
                  />
                  {/* Presets */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[0, 2000, 5000, 8000].map((fee) => (
                      <button
                        key={fee}
                        type="button"
                        onClick={() => applyPresetDelivery(fee)}
                        className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all ${
                          inputs.deliveryCost === fee
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {fee === 0 ? '₦0 (Pickup)' : `₦${fee.toLocaleString('en-NG')}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. PROFIT MARGIN */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profitMargin" className="text-xs font-semibold text-slate-600 flex justify-between">
                    <span>Profit Margin Ratio</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-bold">
                      {(inputs.profitMargin * 100).toFixed(0)}% Margin (x{(1 + inputs.profitMargin).toFixed(2)})
                    </span>
                  </label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 h-11.5">
                    <input
                      id="profitMargin"
                      type="range"
                      min={0.0}
                      max={1.5}
                      step={0.05}
                      value={inputs.profitMargin}
                      onChange={(e) => handleNumChange('profitMargin', parseFloat(e.target.value), 0)}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={3}
                      step={0.01}
                      value={inputs.profitMargin}
                      onChange={(e) => handleNumChange('profitMargin', parseFloat(e.target.value), 0)}
                      className="w-20 text-xs text-center font-bold bg-white border border-slate-100 rounded-lg p-1 text-slate-700"
                    />
                  </div>
                  
                  {/* Presets */}
                  <div className="flex gap-1 mt-1">
                    {[0.3, 0.5, 0.8, 1.0, 1.15].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => applyPresetMargin(p)}
                        className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all ${
                          inputs.profitMargin === p
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {(p * 100).toFixed(0)}% ({(p).toFixed(2)})
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* 7. 🧪 IMAGE PRICING (BETA) */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 block flex items-center gap-1.5">
                    🧪 Image Pricing (Beta) <span className="text-slate-400 font-normal">(Optional)</span>
                  </span>
                  
                  {/* Free vs Pro indicator */}
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    {isPremiumUser ? (
                      <span className="bg-violet-100 text-violet-800 font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border border-violet-200 flex items-center gap-1 shadow-2xs">
                        <Crown className="w-3 h-3 text-violet-705 animate-pulse" /> Pro Member (Unlimited)
                      </span>
                    ) : (
                      <span className={`font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        dailyScansLeft > 0 
                          ? 'bg-slate-100 text-slate-700 border-slate-200' 
                          : 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                      }`}>
                        Scans remaining: <b>{dailyScansLeft}/3 today</b>
                      </span>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setShowPricingModal(true)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                    >
                      {isPremiumUser ? "Plans" : "👑 Upgrade"}
                    </button>
                  </div>
                </div>

                {/* Simulation Control Bar for Review */}
                <div className="bg-slate-100/70 border border-slate-200/60 rounded-lg p-1.5 px-2.5 flex items-center justify-between text-[10px] text-slate-500 gap-2 mb-1.5">
                  <span className="flex items-center gap-0.5 font-semibold text-left">
                    <span className="text-indigo-700 font-bold">🛠️ Limit sandbox:</span> 
                    {isPremiumUser ? "Active unlimited scans" : `Complimentary free scans left: ${dailyScansLeft}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDailyScansLeft(0);
                        setIsPremiumUser(false);
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-700 font-black px-1.5 py-0.5 rounded border border-red-100 transition-all cursor-pointer active:scale-95 text-[9px]"
                      title="Set remainder scans to zero to test daily limit lock"
                    >
                      Simulate Limit Exhaustion
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDailyScansLeft(3);
                        setIsPremiumUser(false);
                      }}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black px-1.5 py-0.5 rounded border border-indigo-100 transition-all cursor-pointer active:scale-95 text-[9px]"
                      title="Reset standard quota"
                    >
                      Reset (3 Left)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPremiumUser(true);
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-705 font-black px-1.5 py-0.5 rounded border border-purple-205 transition-all cursor-pointer active:scale-95 text-[9px]"
                      title="Set subscription status to active"
                    >
                      Activate Pro Free
                    </button>
                  </div>
                </div>

                {!isPremiumUser && dailyScansLeft <= 0 ? (
                  /* EXHAUSTED LIMIT VIEW - UPGRADES CORNER */
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border-2 border-indigo-500/40 rounded-3xl p-6 text-center flex flex-col items-center gap-4.5 shadow-xl relative overflow-hidden" id="daily_scan_limit_lock">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-505/10 bg-indigo-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl -ml-6 -mb-6"></div>
                    
                    <div className="bg-indigo-900/50 p-3 rounded-full border border-indigo-400/25 text-indigo-300 animate-pulse">
                      <Lock className="w-5.5 h-5.5 text-indigo-350 text-indigo-300" />
                    </div>
                    
                    <div className="space-y-3.5 max-w-md">
                      {inputs.businessLevel === 'Premium' ? (
                        <>
                          <h4 className="text-lg font-black text-white leading-tight">You’re working at a premium level — your pricing should match it.</h4>
                          
                          <div className="space-y-2.5 text-slate-300">
                            <p className="text-xs font-semibold text-indigo-200">
                              Unlock unlimited premium-level pricing insights tailored for high-value cakes.
                            </p>
                            <div className="text-left text-xs text-slate-300 space-y-1 bg-white/5 p-3 rounded-xl border border-white/10 max-w-sm mx-auto">
                              <p className="font-bold text-[10px] uppercase text-indigo-350 tracking-wider">With CakeWise Pro:</p>
                              <p className="flex items-center gap-1.5">🧁 Price luxury cakes with confidence</p>
                              <p className="flex items-center gap-1.5">🛡️ Protect your profit margins</p>
                              <p className="flex items-center gap-1.5">📈 Get smarter, market-aligned recommendations</p>
                            </div>
                            <p className="text-xs text-slate-400 font-extrabold italic mt-2 block">
                              You’re not a small baker anymore — don’t price like one.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="text-lg font-black text-white leading-tight">You’ve used your free scans for today.</h4>
                          
                          <div className="space-y-2 text-slate-300">
                            <p className="text-xs font-semibold text-indigo-200">
                              But don’t worry — you’re just getting started 😉
                            </p>
                            <p className="text-xs text-slate-300 font-medium">
                              Keep pricing your cakes the smart way with <b>CakeWise Pro</b>.
                            </p>
                            <p className="text-xs text-slate-400 font-semibold italic">
                              No more guessing. No more undercharging.
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="w-full space-y-2 max-w-xs mt-2">
                      <button
                        type="button"
                        onClick={() => setShowPricingModal(true)}
                        className="w-full text-xs bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-black p-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 duration-200 scale-102"
                      >
                        <Crown className="w-4 h-4 text-yellow-300" /> {inputs.businessLevel === 'Premium' ? "👉 Upgrade to Pro & price at true value" : "👉 Upgrade now to continue & unlock Pro"}
                      </button>

                      <p className="text-[10.5px] text-slate-400 font-medium font-semibold block text-center mt-1">
                        or come back tomorrow for more free scans.
                      </p>
                    </div>

                    {/* Developer sandbox reset option */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full mt-2 border-t border-slate-900/80 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setDailyScansLeft(3);
                          setAnalysisError(null);
                        }}
                        className="text-[9.5px] bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-300 font-bold py-1 px-3 rounded-lg transition-all cursor-pointer active:scale-95"
                      >
                        🔄 Reset Free Sandbox Core (0/3 used)
                      </button>

                      <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                        💡 Manual mode active below
                      </span>
                    </div>
                  </div>
                ) : (
                  /* REGULAR ACTIVE BLOCK FOR UPLOADING AND RUNNING AI INSPECTION */
                  <>
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                        isDragActive 
                          ? 'border-[#FF6FA7] bg-[#FFE6F0]/50' 
                          : inputs.referenceImage 
                          ? 'border-pink-200 bg-[#FFE6F0]/10' 
                          : 'border-pink-200 bg-[#FFF7F5] hover:bg-[#FFE6F0]/20'
                      }`}
                      id="image_drag_zone"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        id="ref_image_input"
                      />
                      
                      {inputs.referenceImage ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full" onClick={(e) => e.stopPropagation()}>
                          <img
                            src={inputs.referenceImage}
                            alt="Cake reference preview"
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-xl object-cover border-2 border-pink-200 shadow-md shrink-0"
                          />
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-black text-[#6B1E57] truncate">{inputs.referenceImageName || 'image_upload.png'}</p>
                            <p className="text-xs text-slate-500">Successfully loaded! You can now analyze design complexity with AI below.</p>
                          </div>
                          <button
                            type="button"
                            onClick={removeReferenceImage}
                            className="text-red-600 bg-red-50 hover:bg-red-100 p-2.5 px-4 rounded-xl text-xs transition-colors font-bold border border-red-200"
                            title="Remove photo"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="bg-[#FFE6F0] p-4 rounded-full text-[#FF6FA7] shadow-xs">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-[#6B1E57]">Scan Your Cake</h4>
                            <p className="text-xs text-slate-500 max-w-sm">
                              Upload a clear image of your cake for accurate AI-based complexity and tier pricing analysis.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="bg-[#FF6FA7] hover:bg-[#ff5697] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md active:scale-95 transition-all mt-1"
                          >
                            Upload Image
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">PNG, JPG, JPEG up to 5MB (fully secure)</span>
                        </div>
                      )}
                    </div>

                    {/* AI ANALYZER TRIGGER & REPORT INTERFACE */}
                    {inputs.referenceImage && (
                      <div className="mt-3 flex flex-col gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl" onClick={(e) => e.stopPropagation()}>
                        {!isAnalyzingImage && !analysisResult && (
                          <div className="flex flex-col gap-2">
                            <p className="text-[11px] text-slate-500 font-medium text-left">
                              Cakewise-AI can automatically inspect your photo to evaluate design complexity and tiers to configure the calculator.
                            </p>
                            <button
                              type="button"
                              onClick={analyzeCakeImage}
                              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-2 px-3 rounded-lg text-xs transition-all shadow-sm"
                            >
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                              Evaluate Design Complexity with AI
                            </button>
                          </div>
                        )}

                        {isAnalyzingImage && (
                          <div className="flex flex-col items-center justify-center py-4 text-center gap-3">
                            <div className="relative flex items-center justify-center animate-pulse">
                              {/* Glowing spinning visual */}
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600"></div>
                              <Sparkles className="absolute w-3.5 h-3.5 text-indigo-550" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-indigo-900">Evaluating Cake Design...</p>
                              <p className="text-[10px] text-indigo-600/80 font-mono">{analysisLoadingStep}</p>
                            </div>
                          </div>
                        )}

                        {analysisError && (
                          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-2.5 text-left">
                            <div className="flex gap-2.5 items-start">
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <div className="text-left space-y-1">
                                <p className="text-xs font-semibold text-red-805 text-red-900">Analysis Unavailable</p>
                                <p className="text-[11px] text-red-700 leading-relaxed font-medium">{analysisError}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1 border-t border-red-100 pt-2 shrink-0">
                              <span className="text-[10px] text-slate-500 font-medium">👇 Guide: Use the manual fields below</span>
                              <button
                                type="button"
                                onClick={analyzeCakeImage}
                                className="text-[11px] font-bold text-red-700 hover:text-red-900 underline hover:no-underline cursor-pointer flex items-center gap-1 bg-white border border-red-200 px-2.5 py-1 rounded-lg shadow-2xs active:scale-95"
                              >
                                Retry Image Scan
                              </button>
                            </div>
                          </div>
                        )}

                        {analysisResult && (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-indigo-650" />
                                Cakewise-AI Vision Report
                              </span>
                              <button
                                type="button"
                                onClick={analyzeCakeImage}
                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                              >
                                Re-analyze
                              </button>
                            </div>

                            {/* visual specs key indicators */}
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="bg-white border border-slate-200/60 p-2 rounded-lg text-center">
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Complexity</p>
                                <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  analysisResult.suggestedComplexity === 'Complex' 
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200/40' 
                                    : analysisResult.suggestedComplexity === 'Moderate'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200/40'
                                    : 'bg-slate-50 text-slate-700 border border-slate-200/40'
                                }`}>
                                  {analysisResult.suggestedComplexity}
                                </span>
                              </div>

                              <div className="bg-white border border-slate-200/60 p-2 rounded-lg text-center">
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Covering</p>
                                <p className="text-xs font-bold text-slate-700 mt-1">{analysisResult.suggestedFrosting}</p>
                              </div>

                              <div className="bg-white border border-slate-200/60 p-2 rounded-lg text-center">
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Visual Tiers</p>
                                <p className="text-xs font-bold text-slate-700 mt-1">{analysisResult.suggestedTiers} Tier{analysisResult.suggestedTiers > 1 ? 's' : ''}</p>
                              </div>
                            </div>

                            {/* EXACT SPEC SUMMARY BOX FORMAT */}
                            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-left font-sans text-xs space-y-1" id="cake_analysis_exact_box">
                              <p className="font-bold text-slate-800 mb-1.5">Cake Analysis:</p>
                              <ul className="space-y-1 text-slate-700">
                                <li>- <span className="font-semibold text-slate-500">Tiers:</span> {inputs.numberOfTiers ? `${inputs.numberOfTiers}-tier` : '(not set)'}</li>
                                <li>- <span className="font-semibold text-slate-500">Size:</span> {inputs.useCustomTiers ? getFormattedSizesString((inputs.customTiers || []).map(t => t.size)) : (inputs.cakeSize ? `${inputs.cakeSize}-inch` : '(not set)')}</li>
                                <li>- <span className="font-semibold text-slate-500">Layers:</span> {inputs.useCustomTiers ? getFormattedLayersString((inputs.customTiers || []).map(t => t.layers)) : (inputs.numberOfLayers ? `${inputs.numberOfLayers} layers per tier` : '(not set)')}</li>
                                <li>- <span className="font-semibold text-slate-500">Design:</span> {getFormattedDesignString(analysisResult.suggestedFrosting, analysisResult.detectedDesignElements, analysisResult.suggestedComplexity)}</li>
                              </ul>
                            </div>

                            {/* confidence and fallback indicators */}
                            <div className="space-y-2">
                              <div className={`flex items-center gap-1.5 text-[11px] font-semibold p-2.5 rounded-lg text-left ${
                                analysisResult.isCakeDetected 
                                  ? 'bg-indigo-50/50 text-indigo-700 border border-indigo-100/20' 
                                  : 'bg-amber-50 text-amber-800 border border-amber-200/40'
                              }`} id="cake_analysis_confidence_note">
                                <span className="text-xs shrink-0">{analysisResult.isCakeDetected ? '✨' : '⚠️'}</span>
                                <span>{analysisResult.confidenceNote}</span>
                              </div>

                              {!analysisResult.isCakeDetected && inputs.cakeSize === '' && (
                                <button
                                  type="button"
                                  onClick={applyStandardEstimate}
                                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2 px-3 rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <span>Confirm Standard Fallback (8&quot; / 2 layers)</span>
                                </button>
                              )}
                            </div>

                            {/* interactive adjustments panel */}
                            <div className="border-t border-slate-200 pt-3.5 space-y-3 text-left">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <span>✏️</span> Adjust Extracted Specifications
                              </p>

                              {/* 1. Tiers selection */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-slate-500 block">Number of Tiers:</span>
                                <div className="flex gap-1.5 flex-wrap">
                                  {[1, 2, 3, 4].map(t => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => handleUpdateAITiers(t)}
                                      className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
                                        inputs.numberOfTiers === t
                                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      {t} {t === 1 ? 'Tier' : 'Tiers'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 2. Custom or Standard setup controllers */}
                              {!inputs.useCustomTiers ? (
                                <div className="grid grid-cols-2 gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-semibold text-slate-500 block">Cake Size:</span>
                                    <div className="grid grid-cols-2 gap-1">
                                      {[6, 8, 10, 12].map(sz => (
                                        <button
                                          key={sz}
                                          type="button"
                                          onClick={() => setInputs(prev => ({ ...prev, cakeSize: sz }))}
                                          className={`text-[10px] font-bold py-1.5 px-1.5 rounded-lg border transition-all cursor-pointer ${
                                            inputs.cakeSize === sz
                                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                          }`}
                                        >
                                          {sz}&quot;
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-semibold text-slate-500 block">Layers:</span>
                                    <div className="grid grid-cols-2 gap-1">
                                      {[1, 2, 3, 4].map(l => (
                                        <button
                                          key={l}
                                          type="button"
                                          onClick={() => setInputs(prev => ({ ...prev, numberOfLayers: l }))}
                                          className={`text-[10px] font-bold py-1.5 px-1.5 rounded-lg border transition-all cursor-pointer ${
                                            inputs.numberOfLayers === l
                                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                          }`}
                                        >
                                          {l} {l === 1 ? 'Layer' : 'Layers'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                  {(inputs.customTiers || []).map((t, idx) => {
                                    const name = idx === 0 
                                      ? 'Bottom Tier' 
                                      : idx === (inputs.customTiers?.length || 0) - 1 
                                        ? 'Top Tier' 
                                        : `Middle Tier ${idx + 1}`;
                                    return (
                                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-600">
                                          <span>{name} (Tier {idx + 1})</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <span className="text-[9px] text-slate-400 font-semibold block">Size:</span>
                                            <div className="flex gap-1 flex-wrap">
                                              {[6, 8, 10, 12].map(sz => (
                                                <button
                                                  key={sz}
                                                  type="button"
                                                  onClick={() => handleUpdateTier(idx, 'size', sz)}
                                                  className={`text-[9px] font-bold px-2 py-1 rounded border transition-all cursor-pointer ${
                                                    t.size === sz
                                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  {sz}&quot;
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <span className="text-[9px] text-slate-400 font-semibold block">Layers:</span>
                                            <div className="flex gap-1 flex-wrap">
                                              {[1, 2, 3, 4].map(l => (
                                                <button
                                                  key={l}
                                                  type="button"
                                                  onClick={() => handleUpdateTier(idx, 'layers', l)}
                                                  className={`text-[9px] font-bold px-2 py-1 rounded border transition-all cursor-pointer ${
                                                    t.layers === l
                                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  {l}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* detected elements */}
                            <div className="space-y-1 text-left">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Detected Design Features</p>
                              <div className="flex flex-wrap gap-1 leading-none mt-1">
                                {analysisResult.detectedDesignElements.map((el, i) => (
                                  <span key={i} className="text-[10px] bg-indigo-50/70 text-indigo-700 font-medium px-2 py-1 rounded-md border border-indigo-100/30">
                                    {el}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Justification prose */}
                            <div className="bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100/20 text-left">
                              <p className="text-[10px] text-indigo-900 leading-relaxed font-normal">
                                {analysisResult.justification}
                              </p>
                            </div>

                            {/* positive confirmation notice */}
                            <p className="text-[10px] text-emerald-800 font-medium flex items-center gap-1 mt-1 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100/30 text-center justify-center">
                              <span>💪</span> Cake specs and pricing factors automatically configured!
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>

            {/* QUICK HISTORY ACCESS OR SYSTEM SAVER FORM */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Save className="w-4 h-4 text-emerald-600" />
                Quote Actions &amp; Saving
              </h3>
              
              <div className="flex flex-col gap-3">
                <form onSubmit={handleSaveCalculation} className="flex gap-2 flex-col sm:flex-row" id="save_calc_form">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={orderName}
                      onChange={(e) => setOrderName(e.target.value)}
                      placeholder="Enter customer name or reference (e.g. Mrs. Ngozi Birthday)"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all font-medium"
                      id="save_ref_name"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      id="save_calc_btn"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleReset();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold px-4 py-3 rounded-xl transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      id="recalculate_btn"
                      title="Clear inputs and start a new cake quote calculation"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Recalculate
                    </button>
                  </div>
                </form>
              </div>

              {saveSuccess && (
                <div className="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Quote successfully stored in local history! View under &quot;Saved Quotes&quot;.
                </div>
              )}
            </div>

          </div>

          {/* Results Display + Breakdown Column */}
          <div className="lg:col-span-5 flex flex-col gap-6" id="results_column">
            
            {/* QUICK SUMMARY HEADER (NEW) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-4.5 shadow-md border border-slate-805 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left relative overflow-hidden" id="quick_summary_header">
              {/* Backglow decor */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-400 block">Quick Specs Summary</span>
                {isEmpty ? (
                  <p className="text-sm font-bold flex items-center gap-1.5 flex-wrap text-slate-300">
                    <span>🎂 Empty Setup</span>
                    <span className="text-slate-700">•</span>
                    <span>No dimensions entered yet</span>
                  </p>
                ) : (
                  <p className="text-sm font-bold flex items-center gap-1.5 flex-wrap text-slate-100">
                    <span>🎂 {inputs.useCustomTiers ? `${inputs.numberOfTiers}-Tier Stack` : `${inputs.cakeSize}-inch`}</span>
                    <span className="text-slate-700">•</span>
                    <span>{inputs.useCustomTiers ? `${(inputs.customTiers || []).reduce((acc, t) => acc + t.layers, 0)} Layers total` : `${inputs.numberOfLayers} layers`}</span>
                    <span className="text-slate-700">•</span>
                    <span>{inputs.frostingType || 'Buttercream'}</span>
                    <span className="text-slate-700">•</span>
                    <span>{inputs.complexityLevel} Complexity</span>
                  </p>
                )}
              </div>
              
              <div className="border-t border-slate-800 sm:border-t-0 sm:border-l sm:pl-4 pt-2.5 sm:pt-0 shrink-0 select-none relative z-10 text-left sm:text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide">
                  Suggested Range ({inputs.businessLevel || 'Growing'} Choice)
                </span>
                <p className="text-base font-black text-emerald-400 font-mono mt-0.5">
                  {isEmpty ? '—' : (() => {
                    const recType = (inputs.businessLevel === 'Beginner') ? 'budget' : (inputs.businessLevel === 'Premium') ? 'premium' : 'standard';
                    return `${formatNaira(results[recType].minPrice)} – ${formatNaira(results[recType].maxPrice)}`;
                  })()}
                </p>
              </div>
            </div>

            {isEmpty ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-5 min-h-[450px] shadow-xs" id="empty_pricing_state">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center animate-pulse border border-emerald-100">
                  <Sparkles className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-lg font-bold text-slate-800">Start a new cake analysis</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload a reference cake photo to automatically analyze sizes, layers, and complexity using CakeWise-AI, or configure your dimensions on the left manually to see pricing instantly.
                  </p>
                </div>

                <div className="w-full max-w-xs border-t border-slate-100 my-1 pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={applyStandardEstimate}
                    className="w-full bg-emerald-650 hover:bg-emerald-700 bg-emerald-600 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer font-sans"
                  >
                    <span>⚡ Use Standard Estimate</span>
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Autofills standard 8&quot; size, 2 layers, and 1 tier
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* PRICING SUGGESTION CARD */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 relative overflow-hidden" id="selling_price_suggestion_card">
              
              {/* Backglow decor */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl -mr-6 -mt-6"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold bg-emerald-900/45 border border-emerald-800/35 px-2.5 py-1 rounded-md">
                  Suggested Retail Price
                </span>
                {inputs.referenceImage && (
                  <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-emerald-400" />
                    Img Attached
                  </span>
                )}
              </div>

              {/* Three Pricing Tiers Display */}
              <div className="my-5 relative z-10 flex flex-col gap-3.5" id="suggested_price_box">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-400 block font-sans text-left">
                  💸 Flexible pricing strategies (Midpoints clickable)
                </span>

                {(() => {
                  const recTier = (inputs.businessLevel === 'Beginner') ? 'Budget' : (inputs.businessLevel === 'Premium') ? 'Premium' : 'Standard';
                  const recText = (inputs.businessLevel === 'Beginner') 
                    ? 'A Beginner setup values order volume and helps you secure early bookings comfortably.'
                    : (inputs.businessLevel === 'Premium')
                    ? 'A Premium brand tier represents boutique artisan efforts and luxury packaging standards.'
                    : 'A Growing establishment benefits most from sustainable Standard margins that align with typical Lagos standards.';
                  return (
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex items-start gap-2.5 text-left" id="smart_recommendation_callout">
                      <span className="text-sm">💡</span>
                      <div>
                        <p className="font-bold text-slate-100">
                          Recommended for you: <span className="text-emerald-400 font-mono font-black">{recTier} Price Option</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {recText} This pricing matches your business level configuration and local average market rates in Nigeria.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 gap-3">
                  
                  {/* Budget Tier */}
                  {(() => {
                    const confInfo = getTierConfidenceInfo('Budget');
                    const isRec = (inputs.businessLevel === 'Beginner');
                    const budgetBorderClass = isRec 
                      ? 'border-2 border-indigo-500 bg-indigo-950/25 ring-2 ring-indigo-500/15 shadow-md' 
                      : 'border border-slate-800 bg-slate-950 hover:border-slate-700/80';
                    const budgetProfitMarginMin = results.budget.minPrice > 0 ? (results.budget.profitMin / results.budget.minPrice) * 100 : 0;
                    return (
                      <div className={`p-3.5 transition-all rounded-2xl flex flex-col justify-between ${budgetBorderClass}`} id="tier_budget">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 text-left">
                            <span className="text-sm">💸</span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-black text-slate-200">Budget Price Option</h4>
                                {isRec && (
                                  <span className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                                    <Sparkles className="w-2 h-2 text-white" /> Recommended
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Customer Friendly (20-30% margin)</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                            Low Price
                          </span>
                        </div>
                        <div className="mt-3.5 flex justify-between items-end border-t border-slate-900 pt-2.5 pb-1">
                          <div className="text-left">
                            <span className="text-[9px] text-slate-450 uppercase tracking-wider block font-bold">Price Range</span>
                            <strong className="text-base sm:text-lg font-mono font-black text-white">{formatNaira(results.budget.minPrice)} – {formatNaira(results.budget.maxPrice)}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-450 uppercase tracking-wider block font-bold">Est. Profit</span>
                            <span className="text-xs font-mono font-bold text-emerald-405 text-emerald-400">{formatNaira(results.budget.profitMin)} – {formatNaira(results.budget.profitMax)}</span>
                          </div>
                        </div>

                        {/* Confidence indicator & rationale */}
                        <div className="mt-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-[10.5px] text-slate-300">
                          <div className="flex items-center gap-1.5 font-semibold text-[10px] text-slate-400">
                            <span className="uppercase font-bold text-[9px] tracking-wider">Confidence level:</span>
                            <span className={`px-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                              confInfo.confidence === 'High' 
                                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-850' 
                                : confInfo.confidence === 'Medium'
                                ? 'bg-amber-900/40 text-amber-400 border border-amber-850'
                                : 'bg-red-900/40 text-red-100 border border-red-850'
                            }`}>
                              ● {confInfo.confidence}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-400 leading-normal text-left">{confInfo.reason}</p>
                        </div>

                        {/* Margin Warning */}
                        {budgetProfitMarginMin < 20 && (
                          <div className="mt-2 bg-amber-955/20 border border-amber-900 p-2 rounded-xl flex items-start gap-1.5 text-left">
                            <span className="text-xs mt-0.5">⚠️</span>
                            <p className="text-[10px] leading-relaxed text-amber-300 font-medium">
                              This price may significantly reduce your profit. Consider using Standard pricing for sustainability.
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setManualPriceOverride(Math.round((results.budget.minPrice + results.budget.maxPrice) / 2).toString())}
                          className="mt-2.5 w-full text-center text-[10px] py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-300 font-bold tracking-wide transition-all cursor-pointer"
                        >
                          Use Budget Midpoint: <b>{formatNaira(Math.round((results.budget.minPrice + results.budget.maxPrice) / 2))}</b>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Standard Tier */}
                  {(() => {
                    const confInfo = getTierConfidenceInfo('Standard');
                    const isRec = (inputs.businessLevel === 'Growing' || !inputs.businessLevel);
                    const standardBorderClass = isRec 
                      ? 'border-2 border-emerald-500 bg-emerald-950/25 ring-2 ring-emerald-500/15 shadow-md' 
                      : 'border border-slate-800 bg-slate-950 hover:border-slate-700/80';
                    return (
                      <div className={`p-3.5 transition-all rounded-2xl flex flex-col justify-between ${standardBorderClass}`} id="tier_standard">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 text-left">
                            <span className="text-sm">⚖️</span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-black text-white">Standard Price Option</h4>
                                {isRec && (
                                  <span className="bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm animate-pulse">
                                    <Sparkles className="w-2 h-2 text-white" /> Recommended
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-emerald-405 font-bold uppercase tracking-wider block text-emerald-400">Market Average (40-60% margin)</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase font-extrabold text-emerald-405 bg-emerald-950 border border-emerald-900/60 px-2.5 py-0.5 rounded-md text-emerald-400 tracking-wider">
                            Recommended
                          </span>
                        </div>
                        <div className="mt-3.5 flex justify-between items-end border-t border-slate-900 pt-2.5 pb-1">
                          <div className="text-left">
                            <span className="text-[9px] text-slate-450 uppercase tracking-wider block font-bold">Price Range</span>
                            <strong className="text-base sm:text-lg font-mono font-black text-white">{formatNaira(results.standard.minPrice)} – {formatNaira(results.standard.maxPrice)}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-450 uppercase tracking-wider block font-bold">Est. Profit</span>
                            <span className="text-xs font-mono font-bold text-emerald-405 text-emerald-400">{formatNaira(results.standard.profitMin)} – {formatNaira(results.standard.profitMax)}</span>
                          </div>
                        </div>

                        {/* Confidence indicator & rationale */}
                        <div className="mt-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-[10.5px] text-slate-300">
                          <div className="flex items-center gap-1.5 font-semibold text-[10px] text-slate-400">
                            <span className="uppercase font-bold text-[9px] tracking-wider">Confidence level:</span>
                            <span className="px-1 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-900/40 text-emerald-400 border border-emerald-850">
                              ● {confInfo.confidence}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-400 leading-normal text-left">{confInfo.reason}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setManualPriceOverride(Math.round((results.standard.minPrice + results.standard.maxPrice) / 2).toString())}
                          className="mt-2.5 w-full text-center text-[10px] py-1.5 bg-emerald-950 hover:bg-emerald-900/40 border border-emerald-900 text-emerald-300 font-bold tracking-wide transition-all cursor-pointer"
                        >
                          Use Standard Midpoint: <b>{formatNaira(Math.round((results.standard.minPrice + results.standard.maxPrice) / 2))}</b>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Premium Tier */}
                  {(() => {
                    const confInfo = getTierConfidenceInfo('Premium');
                    const isRec = (inputs.businessLevel === 'Premium');
                    const premiumBorderClass = isRec 
                      ? 'border-2 border-purple-500 bg-purple-950/25 ring-2 ring-purple-500/15 shadow-md' 
                      : 'border border-slate-800 bg-slate-950 hover:border-slate-700/80';
                    return (
                      <div className={`p-3.5 transition-all rounded-2xl flex flex-col justify-between ${premiumBorderClass}`} id="tier_premium">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 text-left">
                            <span className="text-sm">💎</span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-black text-slate-100">Premium Price Option</h4>
                                {isRec && (
                                  <span className="bg-purple-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                                    <Sparkles className="w-2 h-2 text-white" /> Recommended
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-purple-400 font-semibold uppercase tracking-wider block">High Margin (70-100% margin)</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-purple-400 bg-purple-950/40 border border-purple-900/30 px-2 py-0.5 rounded-md">
                            Premium Quality
                          </span>
                        </div>
                        <div className="mt-3.5 flex justify-between items-end border-t border-slate-900 pt-2.5 pb-1">
                          <div className="text-left">
                            <span className="text-[9px] text-slate-450 uppercase tracking-wider block font-bold">Price Range</span>
                            <strong className="text-base sm:text-lg font-mono font-black text-white">{formatNaira(results.premium.minPrice)} – {formatNaira(results.premium.maxPrice)}</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-450 uppercase tracking-wider block font-bold">Est. Profit</span>
                            <span className="text-xs font-mono font-bold text-emerald-405 text-emerald-400">{formatNaira(results.premium.profitMin)} – {formatNaira(results.premium.profitMax)}</span>
                          </div>
                        </div>

                        {/* Confidence indicator & rationale */}
                        <div className="mt-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-[10.5px] text-slate-300">
                          <div className="flex items-center gap-1.5 font-semibold text-[10px] text-slate-400">
                            <span className="uppercase font-bold text-[9px] tracking-wider">Confidence level:</span>
                            <span className={`px-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                              confInfo.confidence === 'High' 
                                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-850' 
                                : confInfo.confidence === 'Medium'
                                ? 'bg-amber-900/40 text-amber-400 border border-amber-850'
                                : 'bg-red-900/40 text-red-100 border border-red-850'
                            }`}>
                              ● {confInfo.confidence}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-400 leading-normal text-left">{confInfo.reason}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setManualPriceOverride(Math.round((results.premium.minPrice + results.premium.maxPrice) / 2).toString())}
                          className="mt-2.5 w-full text-center text-[10px] py-1.5 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-900/40 text-purple-300 font-bold tracking-wide transition-all cursor-pointer"
                        >
                          Use Premium Midpoint: <b>{formatNaira(Math.round((results.premium.minPrice + results.premium.maxPrice) / 2))}</b>
                        </button>
                      </div>
                    );
                  })()}

                </div>
              </div>

              {/* Confidence Indicator Badge Box */}
              <div className={`my-4 p-3 rounded-2xl border text-xs flex flex-col gap-1.5 backdrop-blur-xs relative z-10 ${confidenceColor}`} id="confidence_box">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <span>{confidenceLabel}</span>
                </div>
                <p className="opacity-95 leading-relaxed text-[11px]">{confidenceDesc}</p>
                {results.isAnchorCorrected && (
                  <div className="text-[9px] uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Naija Market calibration boundary active</span>
                  </div>
                )}
              </div>

              {/* Manual Price Override Sector */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 my-4 relative z-10" id="manual_override_sector">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                  <span>Custom Quote Override</span>
                  {isOverridden && <span className="text-emerald-400 font-bold">Active Override Applied</span>}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-sm font-bold">₦</span>
                    <input
                      type="number"
                      value={manualPriceOverride}
                      onChange={(e) => setManualPriceOverride(e.target.value)}
                      placeholder={results.suggestedSellingPrice.toString()}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-mono placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      id="manual_price_override_field"
                    />
                  </div>
                  {isOverridden && (
                    <button
                      onClick={() => setManualPriceOverride('')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition-colors border border-slate-700/60"
                      id="reset_override_btn"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {isOverridden && (
                  <div className="mt-3 bg-slate-900/50 rounded-xl p-2.5 border border-slate-850 text-[11px] flex flex-col gap-1.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase font-bold tracking-wider">Custom Profit</span>
                        <strong className="text-emerald-400 font-mono text-xs">{formatNaira(activeProfit)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase font-bold tracking-wider">Markup / Margin</span>
                        <strong className="text-slate-100 font-mono text-xs">{activeMarkup.toFixed(0)}% / {activeMargin.toFixed(0)}%</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800/80 my-4"></div>

              {/* Cost & Profit Side by Side */}
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800/50">
                  <span className="text-[11px] text-slate-400 block font-medium">Production Cost</span>
                  <span className="text-base font-bold text-slate-100 font-mono block">
                    {formatNaira(results.totalCost)}
                  </span>
                </div>
                <div className="bg-emerald-900/10 p-3 rounded-2xl border border-emerald-900/35">
                  <span className="text-[11px] text-emerald-400 block font-medium">Expected Profit</span>
                  <span className="text-base font-bold text-emerald-405 font-mono block text-emerald-400">
                    {formatNaira(activeProfit)}
                  </span>
                </div>
              </div>

              {/* Dynamic specs line badge banner */}
              <div className="mt-4 bg-slate-800/20 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-400 flex flex-col gap-1.5" id="suggested_specs_banner">
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-between text-xs pb-1.5 border-b border-slate-850">
                  <span>🍫 <b>Flavor:</b> {inputs.cakeType}</span>
                  <span>✨ <b>Design:</b> {inputs.complexityLevel}</span>
                  <span>🖌️ <b>Cover:</b> {inputs.frostingType || 'Buttercream'}</span>
                  <span>🚚 <b>Fee:</b> {inputs.deliveryCost > 0 ? formatNaira(inputs.deliveryCost) : 'Pickup'}</span>
                </div>
                <div className="flex flex-col gap-1 text-[10px] text-slate-350">
                  <span className="font-bold uppercase text-[9px] text-emerald-400 tracking-wider">Tier Dimensions:</span>
                  {!inputs.useCustomTiers ? (
                    <span>🎂 Standard Setup: <b>{inputs.numberOfTiers} Tier(s)</b> — {inputs.cakeSize}&quot; diameter with {inputs.numberOfLayers} layers each.</span>
                  ) : (
                    <div className="flex flex-col gap-1 font-mono">
                      {(inputs.customTiers || []).map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded-md">
                          <span>🎂 Tier {idx + 1}: <b>{t.size}&quot;</b> ({t.layers}L)</span>
                          <span className="text-emerald-400/90 text-[9px]">Sponge Scale: {((t.size / 8) * (t.size / 8) * t.layers).toFixed(2)}x</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* "WHY THIS PRICE?" SECTION (NEW) */}
              <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-left" id="why_this_price_section">
                <h5 className="text-[10px] uppercase font-extrabold tracking-widest text-slate-300 flex items-center gap-1.5 mb-2">
                  <span>❓</span> Why this price?
                </h5>
                <ul className="space-y-1.5 text-[11px] leading-relaxed text-slate-400">
                  <li className="flex gap-1.5 items-start">
                    <span className="text-emerald-500 shrink-0 font-bold">•</span>
                    <span><b>Ingredient Price Trends (Nigeria):</b> Calibrated using premium local market values for flour, eggs, butter, and imports, without artificial low-balling.</span>
                  </li>
                  <li className="flex gap-1.5 items-start">
                    <span className="text-emerald-500 shrink-0 font-bold">•</span>
                    <span><b>Craftsmanship Complexity:</b> Compensates directly for piping time, tier leveling, custom structures, and labor spent on design themes.</span>
                  </li>
                  <li className="flex gap-1.5 items-start">
                    <span className="text-emerald-500 shrink-0 font-bold">•</span>
                    <span><b>Local Urban Benchmarks:</b> Verified against real-world rate cards from professional bakeries across Nigeria (Ikeja, Lekki, and Abuja).</span>
                  </li>
                </ul>
              </div>

            </div>

            {/* DETAILED COST BREAKDOWN ACCORDION/CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6" id="cost_breakdown_card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5" id="breakdown_title">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  Line Item Cost Groups
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase bg-slate-100 px-2.5 py-1 rounded-md">
                  Cost Attributed (65% share)
                </span>
              </div>

              <div className="flex flex-col gap-3.5">
                
                {/* GROUP 1: INGREDIENTS */}
                <div className="flex flex-col gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => setShowDetailedIngredients(!showDetailedIngredients)}
                    type="button"
                    className="flex justify-between items-center text-xs font-bold text-slate-700 w-full hover:text-slate-900 cursor-pointer"
                    id="toggle_ingredients_group"
                  >
                    <span className="flex items-center gap-1 p-0.5">
                      <span>🥞 1. Ingredients Cost</span>
                      <span className="text-[10px] text-slate-400 font-normal hidden sm:inline"> (Flour, sugar, eggs, coverings...)</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-emerald-700 font-extrabold">{formatNaira(results.breakdown.ingredients.total)}</span>
                      {showDetailedIngredients ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>
                  
                  {/* Detailed Ingredient Itemizer list */}
                  {showDetailedIngredients && (
                    <div className="text-[11px] text-slate-500 border-t border-slate-200/50 pt-2 flex flex-col gap-2 font-sans mt-1" id="ingredient_itemizer_list">
                      <div className="flex justify-between">
                        <span>Flour ({Math.round(results.ingredientQuantities.flour)}g @ ₦{INGREDIENT_UNIT_COSTS.flour.toFixed(2)}/g)</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.flourCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sugar ({Math.round(results.ingredientQuantities.sugar)}g @ ₦{INGREDIENT_UNIT_COSTS.sugar.toFixed(2)}/g)</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.sugarCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Margarine ({Math.round(results.ingredientQuantities.margarine)}g @ ₦{INGREDIENT_UNIT_COSTS.margarine.toFixed(2)}/g)</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.margarineCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Eggs ({Math.round(results.ingredientQuantities.eggs)} units @ ₦{INGREDIENT_UNIT_COSTS.eggs.toFixed(0)})</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.eggsCost)}</span>
                      </div>
                      {results.ingredientQuantities.cocoa > 0 && (
                        <div className="flex justify-between">
                          <span>Cocoa powder ({Math.round(results.ingredientQuantities.cocoa)}g @ ₦{INGREDIENT_UNIT_COSTS.cocoa.toFixed(2)}/g)</span>
                          <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.cocoaCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Milk ({Math.round(results.ingredientQuantities.milk)}ml @ ₦{INGREDIENT_UNIT_COSTS.milk.toFixed(2)}/ml)</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.milkCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vegetable Oil ({Math.round(results.ingredientQuantities.oil)}ml @ ₦{INGREDIENT_UNIT_COSTS.oil.toFixed(2)}/ml)</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.oilCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Baking Powder ({Math.round(results.ingredientQuantities.bakingPowder)}g @ ₦{INGREDIENT_UNIT_COSTS.bakingPowder.toFixed(2)}/g)</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.bakingPowderCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Flavouring Essence ({Math.round(results.ingredientQuantities.flavouring)}ml @ ₦{INGREDIENT_UNIT_COSTS.flavouring.toFixed(2)}/ml)</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.flavouringCost)}</span>
                      </div>
                      {results.ingredientQuantities.mixedFruits && results.ingredientQuantities.mixedFruits > 0 ? (
                        <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50/50 px-1 py-0.5 rounded-md">
                          <span>🍒 Rum-Soaked Mixed Fruits ({Math.round(results.ingredientQuantities.mixedFruits)}g @ ₦{INGREDIENT_UNIT_COSTS.mixedFruits.toFixed(2)}/g)</span>
                          <span className="font-mono text-emerald-800">{formatNaira(results.breakdown.ingredients.mixedFruitsCost || 0)}</span>
                        </div>
                      ) : null}
                      {results.ingredientQuantities.icingSugar > 0 && (
                        <div className="flex justify-between">
                          <span>Icing Sugar ({Math.round(results.ingredientQuantities.icingSugar)}g @ ₦{INGREDIENT_UNIT_COSTS.icingSugar.toFixed(2)}/g)</span>
                          <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.icingSugarCost)}</span>
                        </div>
                      )}
                      {results.ingredientQuantities.buttercreamMargarine > 0 && (
                        <div className="flex justify-between">
                          <span>Buttercream Margarine ({Math.round(results.ingredientQuantities.buttercreamMargarine)}g @ ₦{INGREDIENT_UNIT_COSTS.buttercreamMargarine.toFixed(2)}/g)</span>
                          <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.buttercreamMargarineCost)}</span>
                        </div>
                      )}
                      {results.ingredientQuantities.whippingCreamPowder ? results.ingredientQuantities.whippingCreamPowder > 0 && (
                        <div className="flex justify-between">
                          <span>Whipping Cream Powder ({Math.round(results.ingredientQuantities.whippingCreamPowder)}g @ ₦{INGREDIENT_UNIT_COSTS.whippingCreamPowder.toFixed(2)}/g)</span>
                          <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.whippingCreamPowderCost || 0)}</span>
                        </div>
                      ) : null}
                      {results.ingredientQuantities.chocolateSlabs ? results.ingredientQuantities.chocolateSlabs > 0 && (
                        <div className="flex justify-between">
                          <span>Chocolate Slabs ({Math.round(results.ingredientQuantities.chocolateSlabs)}g @ ₦{INGREDIENT_UNIT_COSTS.chocolateSlabs.toFixed(2)}/g)</span>
                          <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.chocolateSlabsCost || 0)}</span>
                        </div>
                      ) : null}
                      {results.ingredientQuantities.liquidCream ? results.ingredientQuantities.liquidCream > 0 && (
                        <div className="flex justify-between">
                          <span>Liquid Double Cream ({Math.round(results.ingredientQuantities.liquidCream)}ml @ ₦{INGREDIENT_UNIT_COSTS.liquidCream.toFixed(2)}/ml)</span>
                          <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.liquidCreamCost || 0)}</span>
                        </div>
                      ) : null}
                      {results.ingredientQuantities.fondant ? results.ingredientQuantities.fondant > 0 && (
                        <div className="flex justify-between">
                          <span>Rolled Fondant Covering ({Math.round(results.ingredientQuantities.fondant)}g @ ₦{INGREDIENT_UNIT_COSTS.fondant.toFixed(2)}/g)</span>
                          <span className="font-mono text-slate-700">{formatNaira(results.breakdown.ingredients.fondantCost || 0)}</span>
                        </div>
                      ) : null}
                      <p className="text-[10px] text-emerald-600 font-medium pt-1.5 bg-emerald-50/20 px-1 rounded-sm">
                        💡 Costs are scaled dynamically and adjusted by a <b>65% usage factor</b> representing shared preparations and bulk purchasing across orders.
                      </p>
                    </div>
                  )}
                </div>

                {/* GROUP 2: LABOUR */}
                <div className="flex justify-between items-center text-xs p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">👷 2. Labour Cost</span>
                    <span className="text-[10px] text-slate-400">Fixed rate based on complexity tier specs</span>
                  </div>
                  <span className="font-bold text-slate-850 font-mono text-sm">{formatNaira(results.breakdown.labour)}</span>
                </div>

                {/* GROUP 3: OVERHEAD */}
                <div className="flex justify-between items-center text-xs p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">⚡ 3. Overhead Cost</span>
                    <span className="text-[10px] text-slate-400">Electricity, workspace gas flat rate</span>
                  </div>
                  <span className="font-bold text-slate-850 font-mono text-sm">{formatNaira(results.breakdown.overhead)}</span>
                </div>

                {/* GROUP 4: OTHERS */}
                <div className="flex flex-col gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => setShowDetailedOthers(!showDetailedOthers)}
                    type="button"
                    className="flex justify-between items-center text-xs font-bold text-slate-700 w-full hover:text-slate-900 cursor-pointer"
                    id="toggle_others_group"
                  >
                    <span className="flex items-center gap-1 p-0.5">
                      <span>📦 4. Others Cost</span>
                      <span className="text-[10px] text-slate-400 font-normal hidden sm:inline"> (Delivery, packaging, design surcharge...)</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-900 font-extrabold">
                        {formatNaira(results.breakdown.delivery + results.breakdown.packaging + results.breakdown.complexityExtra)}
                      </span>
                      {showDetailedOthers ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>

                  {/* Detailed Others subset */}
                  {showDetailedOthers && (
                    <div className="text-[11px] text-slate-500 border-t border-slate-200/50 pt-2 flex flex-col gap-2 font-sans mt-1" id="others_itemizer_list">
                      <div className="flex justify-between">
                        <span>Courier / Delivery Freight</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.delivery)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cake Carton Box & Packaging Boards</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.packaging)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>({inputs.complexityLevel}) Design Complexity Surcharge</span>
                        <span className="font-mono text-slate-700">{formatNaira(results.breakdown.complexityExtra)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Cost Recount Indicator */}
                <div className="flex justify-between items-center pt-3.5 mt-2 text-sm font-black border-t-2 border-dashed border-slate-200">
                  <span className="text-slate-850">TOTAL PRODUCTION COST</span>
                  <span className="font-mono text-slate-950 text-base">{formatNaira(results.totalCost)}</span>
                </div>

              </div>

            </div>
          </>
        )}

          </div>
        </div>

        {/* PERSISTED QUOTES SIDE SPLIT HISTORY PANEL (IF OPENED OR ALWAYS DISPLAYED UNDERNEATH FOR DISCOVERABILITY) */}
        <div className="mt-8 border-t border-slate-200 pt-6" id="history_anchor_section">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="text-yellow-600 w-5 h-5" />
              Saved Quotes &amp; Orders History ({history.length})
            </h2>
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Delete all saved order quotes permanently?')) {
                    saveToLocalStorage([]);
                  }
                }}
                className="text-[11px] font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200/20 transition-all"
                id="clear_all_history_btn"
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center" id="empty_history_indicator">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <h4 className="text-sm font-bold text-slate-700 mb-1">No saved calculations yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Once you generate a quote, type a customer reference name and click <b className="text-slate-600">&quot;Save Quote&quot;</b> above to save it in your client lookup list.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="history_cards_grid">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleLoadCalculation(item)}
                  className="bg-white border border-slate-200 rounded-2xl p-4.5 hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3 group relative"
                  title="Click to reload this cake order specifications into the calculator"
                >
                  <div className="flex top-0 justify-between items-start">
                    <div className="min-w-0 flex-1 pr-4">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-600 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mb-1">{item.date}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCalculation(item.id, e)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors scale-90"
                      title="Delete quote"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100/60">
                    {item.inputs.referenceImage ? (
                      <img
                        src={item.inputs.referenceImage}
                        alt="Thumbnail"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/50">
                        <Cake className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-[11px] text-slate-500">
                      <p className="font-medium text-slate-700 truncate">
                        {item.inputs.cakeType} ({item.inputs.cakeSize}&quot;, {item.inputs.numberOfTiers}T, {item.inputs.numberOfLayers || 2}L)
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Design: {item.inputs.complexityLevel} • Frosting: {item.inputs.frostingType || 'Buttercream'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col border-t border-slate-100/70 pt-2 text-[11px] gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">Standard Price:</span>
                      <strong className="font-mono text-xs text-slate-850">
                        {formatNaira(item.result.suggestedSellingPrice)}
                      </strong>
                    </div>
                    {item.result.budget && (
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-medium">Budget Option:</span>
                        <span className="font-mono">{formatNaira(item.result.budget.minPrice)} – {formatNaira(item.result.budget.maxPrice)}</span>
                      </div>
                    )}
                    {item.result.premium && (
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-medium">Premium Option:</span>
                        <span className="font-mono">{formatNaira(item.result.premium.minPrice)} – {formatNaira(item.result.premium.maxPrice)}</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold py-0.5 px-2 rounded-full opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    Click to load 🎂
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-400" id="app_footer_container">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} CakeWise. Made for small-scale bakers in Nigeria.</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-[10px]">
            <span>🎯 Unit Costs calibrated with modern market norms (Flour ₦{INGREDIENT_UNIT_COSTS.flour.toFixed(2)}/g, Sugar ₦{INGREDIENT_UNIT_COSTS.sugar.toFixed(2)}/g, Margarine ₦{INGREDIENT_UNIT_COSTS.margarine.toFixed(2)}/g, Eggs ₦{INGREDIENT_UNIT_COSTS.eggs.toFixed(0)}, BP ₦{INGREDIENT_UNIT_COSTS.bakingPowder.toFixed(2)}/g, Flavour ₦{INGREDIENT_UNIT_COSTS.flavouring.toFixed(2)}/ml, Icing Sugar ₦{INGREDIENT_UNIT_COSTS.icingSugar.toFixed(2)}/g, Buttercream Fat ₦{INGREDIENT_UNIT_COSTS.buttercreamMargarine.toFixed(2)}/g, Packaging ₦{INGREDIENT_UNIT_COSTS.packaging.toLocaleString()})</span>
          </p>
        </div>
      </footer>

      {/* 👑 PREMIUM SUBSCRIPTION AND PRICING MODAL */}
      <AnimatePresence>
         {showPricingModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowPricingModal(false); setPaymentPlanToCheckout(null); setPaymentFeedback(null); }}
              className="fixed inset-0 bg-slate-900/85 backdrop-blur-xs"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] border border-slate-200 z-10 overflow-hidden flex flex-col relative"
              id="pricing_modal_panel"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => { setShowPricingModal(false); setPaymentPlanToCheckout(null); setPaymentFeedback(null); }}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 p-2 rounded-full transition-colors cursor-pointer active:scale-95 z-20"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200" id="pricing_modal_scroll_content">
                {/* Header */}
                <div className="text-center space-y-3 mb-8">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-md animate-bounce mt-1">
                    <Crown className="w-3.5 h-3.5 text-yellow-300 animate-pulse" /> Upgrade to CakeWise Pro
                  </span>
                  {inputs.businessLevel === 'Premium' ? (
                    <>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">You’re working at a premium level — your pricing should match it.</h3>
                      <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Unlock unlimited <span className="text-indigo-600 font-extrabold">premium-level pricing insights</span> tailored for high-value cakes.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Stop guessing your cake prices. Start charging with confidence.</h3>
                      <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        With <b>CakeWise Pro</b>, you don’t just get more scans — you get smarter pricing that helps you make <span className="text-emerald-600 font-extrabold underline decoration-emerald-300 decoration-2">real profit</span>.
                      </p>
                    </>
                  )}
                </div>

                {/* Selling Pillars / Callouts */}
                {inputs.businessLevel === 'Premium' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-8">
                    <div className="bg-indigo-50/70 border border-indigo-200/50 p-3.5 rounded-xl text-left flex items-start gap-2.5">
                      <span className="text-lg">💎</span>
                      <div>
                        <p className="text-xs font-black text-indigo-900">Price Luxury Cakes</p>
                        <p className="text-[11px] text-indigo-800 leading-normal mt-0.5">Price complex wedding and luxury custom cakes with absolute confidence.</p>
                      </div>
                    </div>
                    <div className="bg-emerald-50/70 border border-emerald-200/50 p-3.5 rounded-xl text-left flex items-start gap-2.5">
                      <span className="text-lg">🛡️</span>
                      <div>
                        <p className="text-xs font-black text-emerald-900">Protect Profit Margins</p>
                        <p className="text-[11px] text-emerald-800 leading-normal mt-0.5">Guard your premium rates from client negotiation pressures and protect margins.</p>
                      </div>
                    </div>
                    <div className="bg-purple-50/70 border border-purple-200/50 p-3.5 rounded-xl text-left flex items-start gap-2.5">
                      <span className="text-lg">📈</span>
                      <div>
                        <p className="text-xs font-black text-purple-900">Get Smarter Recommendations</p>
                        <p className="text-[11px] text-purple-800 leading-normal mt-0.5">Get smarter, market-aligned rate suggestions adjusted for high-tier baker standards.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-8">
                    <div className="bg-amber-50/70 border border-amber-200/50 p-3.5 rounded-xl text-left flex items-start gap-2.5">
                      <span className="text-lg">💡</span>
                      <div>
                        <p className="text-xs font-black text-amber-900">No More Underpricing</p>
                        <p className="text-[11px] text-amber-800 leading-normal mt-0.5">Understand every hidden oven, boards, and ribbon cost instantly.</p>
                      </div>
                    </div>
                    <div className="bg-pink-50/70 border border-pink-200/50 p-3.5 rounded-xl text-left flex items-start gap-2.5">
                      <span className="text-lg">💡</span>
                      <div>
                        <p className="text-xs font-black text-pink-900">No More Fear of Customers</p>
                        <p className="text-[11px] text-pink-800 leading-normal mt-0.5">Stand firm on quotes. Never let a “customer scare me to reduce price” again.</p>
                      </div>
                    </div>
                    <div className="bg-emerald-50/70 border border-emerald-200/50 p-3.5 rounded-xl text-left flex items-start gap-2.5">
                      <span className="text-lg">💡</span>
                      <div>
                        <p className="text-xs font-black text-emerald-900">No More Silent Losses</p>
                        <p className="text-[11px] text-emerald-800 leading-normal mt-0.5">Keep track of your real markups. Stop disguise losses as high sales.</p>
                      </div>
                    </div>
                  </div>
                )}

                {paymentPlanToCheckout ? (
                  /* 🔒 REAL PAYSTACK CHECKOUT WINDOW */
                  <div className="max-w-md mx-auto py-6 text-left space-y-6 animate-fade-in" id="secure_checkout_view">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                        🔒 Secure Paystack Payment
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Complete Your Payment</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Payment Merchant: <span className="font-extrabold text-indigo-600">CakeWise (Testibites Cakes)</span>
                      </p>
                    </div>

                    {paymentFeedback && (
                      <div className={`p-4 rounded-xl text-xs font-semibold text-left border animate-fade-in ${
                        paymentFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="text-sm">{paymentFeedback.type === 'success' ? '✅' : '❌'}</span>
                          <span className="flex-1 leading-relaxed">{paymentFeedback.text}</span>
                        </div>
                      </div>
                    )}

                    {/* Order summary card */}
                    {(() => {
                      const isStandard = paymentPlanToCheckout.startsWith('standard');
                      const cycle = paymentPlanToCheckout.endsWith('weekly') ? 'weekly' : 'monthly';
                      const amountNGN = isStandard 
                        ? (cycle === 'weekly' ? 500 : 2000) 
                        : (cycle === 'weekly' ? 2000 : 5000);
                      const planName = isStandard ? "Standard Plan" : "Premium Plan";

                      const handleCycleChange = (newCycle: 'weekly' | 'monthly') => {
                        const base = isStandard ? 'standard' : 'premium';
                        setPaymentPlanToCheckout(`${base}_${newCycle}` as any);
                        setPaymentFeedback(null);
                      };

                      return (
                        <>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3 shadow-2xs">
                            <div className="flex justify-between items-center text-xs text-slate-500">
                              <span className="font-semibold">Selected Plan</span>
                              <span className="font-bold text-slate-800 uppercase tracking-wider">
                                {planName}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                              <span className="font-semibold">Subscription Interval</span>
                              <span className="font-bold text-slate-800 uppercase">
                                {cycle}
                              </span>
                            </div>
                            <hr className="border-slate-200" />
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-700">Total Charged Today</span>
                              <span className="text-base font-black text-indigo-950 font-mono">
                                ₦{amountNGN.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Billing cycle & dynamic email fields */}
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                Choose Billing Interval
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  type="button" 
                                  onClick={() => handleCycleChange('weekly')}
                                  className={`p-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                    cycle === 'weekly'
                                      ? 'border-indigo-650 bg-indigo-50 border-2 text-indigo-900 shadow-3xs'
                                      : 'border-slate-200 bg-white hover:border-indigo-100 text-slate-600'
                                  }`}
                                >
                                  📅 Weekly ({isStandard ? '₦500' : '₦2,000'})
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleCycleChange('monthly')}
                                  className={`p-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                    cycle === 'monthly'
                                      ? 'border-indigo-650 bg-indigo-50 border-2 text-indigo-900 shadow-3xs'
                                      : 'border-slate-200 bg-white hover:border-indigo-100 text-slate-600'
                                  }`}
                                >
                                  📆 Monthly ({isStandard ? '₦2,000' : '₦5,000'})
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                Dynamic Receipt Email Address
                              </label>
                              <input 
                                type="email" 
                                className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-indigo-200 focus:border-indigo-500 rounded-xl px-3.5 py-3 text-slate-800 font-medium focus:outline-hidden transition-all"
                                value={checkoutEmail}
                                onChange={(e) => {
                                  setCheckoutEmail(e.target.value);
                                  setBakerEmail(e.target.value);
                                }}
                                placeholder="customer@cakewise.com"
                                required
                              />
                            </div>

                            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex justify-between items-center text-[10px] text-slate-400">
                              <span className="font-bold uppercase tracking-wider">Reference ID</span>
                              <span className="font-mono text-slate-500 bg-slate-200/40 px-2 py-0.5 rounded font-bold">
                                {checkoutReference}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <button
                              type="button"
                              onClick={() => handlePaystackPayment(paymentPlanToCheckout, checkoutEmail, checkoutReference)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                              id="authorize_payment_btn"
                            >
                              💳 Pay ₦{amountNGN.toLocaleString()} with Paystack Inline
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentPlanToCheckout(null);
                                setPaymentFeedback(null);
                              }}
                              className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 py-2 hover:underline cursor-pointer"
                            >
                              ← Back to pricing plans
                            </button>
                          </div>
                        </>
                      );
                    })()}

                    {/* Trust-building microcopy */}
                    <div className="border-t border-slate-100 pt-4 text-center space-y-1.5">
                      <p className="text-[10.5px] text-slate-500 leading-normal font-medium">
                        Secure payments powered by <span className="font-extrabold text-slate-700">Testibites Cakes N’ Pastries</span>
                      </p>
                      <p className="text-[9.5px] text-slate-450 font-normal">
                        Your transaction details are encrypted with SSL protocols. Safe, instant upgrades.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                      {/* Tier 1: Free Starter */}
                      <div 
                        onClick={() => setSelectedPlanTab('free')}
                        className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 cursor-pointer relative select-none hover:shadow-md ${
                          selectedPlanTab === 'free'
                            ? 'border-emerald-500 bg-emerald-50/15 ring-2 ring-emerald-500/30 scale-[1.015] shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 opacity-90'
                        }`}
                        id="plan_card_free"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Casual Bakers</p>
                              <h4 className="text-base font-black text-slate-800 mt-1">Free Sandbox</h4>
                            </div>
                            {selectedPlanTab === 'free' ? (
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shadow-2xs">
                                <Check className="w-3" /> Selected
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[8px] text-slate-300">
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900">₦0</span>
                            <span className="text-xs text-slate-400 font-mono font-medium">/ forever</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                            Perfect for absolute beginners, casual home enthusiasts, and culinary students learning standard variables.
                          </p>
                          
                          <hr className="border-slate-100" />
                          
                          <ul className="space-y-2 text-[11px] text-slate-600 text-left font-medium">
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>3 complimentary AI visual scans per day</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>Standard ingredient calculation</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>Local storage calculator history list</span>
                            </li>
                            <li className="flex items-start gap-1.5 text-slate-400 line-through">
                              <Lock className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                              <span>No client custom WhatsApp ready format</span>
                            </li>
                          </ul>
                        </div>

                        <div className="mt-6 pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanTab('free');
                              setIsPremiumUser(false);
                              setDailyScansLeft(3);
                              setShowPricingModal(false);
                            }}
                            className={`w-full text-center text-xs font-black py-3 px-4 rounded-xl transition-all cursor-pointer ${
                              selectedPlanTab === 'free'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 active:scale-95'
                            }`}
                            id="plan_btn_free"
                          >
                            Continue with Free
                          </button>
                        </div>
                      </div>

                      {/* Tier 2: Premium Weekly (AFFORDABLE INTRO - Standard) */}
                      <div 
                        onClick={() => setSelectedPlanTab('weekly')}
                        className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 cursor-pointer relative select-none hover:shadow-md ${
                          selectedPlanTab === 'weekly'
                            ? 'border-pink-500 bg-pink-50/15 ring-2 ring-pink-500/30 scale-[1.015] shadow-sm'
                            : 'border-pink-100 bg-white hover:border-pink-200 opacity-90'
                        }`}
                        id="plan_card_standard"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-pink-500 font-mono">Flexible Pro</p>
                              <h4 className="text-base font-black text-slate-800 mt-1">Standard Plan</h4>
                            </div>
                            {selectedPlanTab === 'weekly' ? (
                              <span className="bg-pink-100 text-pink-800 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-pink-200 flex items-center gap-1 shadow-2xs">
                                <Check className="w-3" /> Selected
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[8px] text-slate-300">
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 bg-pink-50/30 p-2.5 rounded-xl border border-pink-100 text-left">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500 font-semibold">Weekly Standard:</span>
                              <span className="text-base font-black text-pink-900 font-mono">₦500<span className="text-[10px] text-slate-400 font-normal">/wk</span></span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500 font-semibold">Monthly Standard:</span>
                              <span className="text-base font-black text-pink-900 font-mono">₦2,000<span className="text-[10px] text-slate-400 font-normal">/mo</span></span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                            Perfect for growing home bakers looking for flexible, high-accuracy pricing and margin protection.
                          </p>
                          
                          <hr className="border-slate-100" />
                          
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">✨ what you unlock:</div>
                          <ul className="space-y-2 text-[11px] text-slate-600 text-left font-medium">
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-pink-500 shrink-0 mt-0.5" />
                              <span className="text-slate-800 font-bold">Unlimited image pricing scans</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-pink-500 shrink-0 mt-0.5" />
                              <span>Accurate specs based on baker level</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-pink-500 shrink-0 mt-0.5" />
                              <span className="text-slate-800 font-semibold">Profit visibility &amp; net cost tracking</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-pink-500 shrink-0 mt-0.5" />
                              <span>Priority AI scanning (faster outcomes)</span>
                            </li>
                          </ul>
                        </div>

                        <div className="mt-6 pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanTab('weekly');
                              setPaymentPlanToCheckout('standard_weekly');
                            }}
                            className={`w-full text-center text-xs py-3 px-4 rounded-xl transition-all cursor-pointer font-extrabold ${
                              selectedPlanTab === 'weekly'
                                ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-md'
                                : 'bg-white text-pink-600 hover:bg-pink-50 border border-pink-200 active:scale-95'
                            }`}
                            id="plan_btn_standard"
                          >
                            Upgrade to Standard
                          </button>
                        </div>
                      </div>

                      {/* Tier 3: CakeWise Pro Monthly (RECOMMENDED & ULTIMATE - Premium) */}
                      <div 
                        onClick={() => setSelectedPlanTab('monthly')}
                        className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition-all duration-200 cursor-pointer relative select-none hover:shadow-md ${
                          selectedPlanTab === 'monthly'
                            ? 'border-indigo-600 bg-indigo-50/15 ring-2 ring-indigo-500/30 scale-[1.015] shadow-md font-medium'
                            : 'border-indigo-150 bg-white hover:border-indigo-200 opacity-90'
                        }`}
                        id="plan_card_premium"
                      >
                        {/* Recommended Pill banner */}
                        <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-700 via-purple-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1 shrink-0 whitespace-nowrap z-10">
                          <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Popular Choice / Ultimate Savings
                        </div>

                        <div className="space-y-4 pt-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 font-mono">Master Baker</p>
                              <h4 className="text-base font-black text-slate-900 mt-1 flex items-center gap-1">
                                Premium Plan
                              </h4>
                            </div>
                            {selectedPlanTab === 'monthly' ? (
                              <span className="bg-indigo-100 text-indigo-800 font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1 shadow-2xs">
                                <Check className="w-3" /> Selected
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[8px] text-slate-300">
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 bg-indigo-50/30 p-2.5 rounded-xl border border-indigo-100 text-left">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500 font-semibold">Weekly Premium:</span>
                              <span className="text-base font-black text-indigo-900 font-mono">₦2,000<span className="text-[10px] text-slate-400 font-normal">/wk</span></span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500 font-semibold">Monthly Premium:</span>
                              <span className="text-base font-black text-indigo-900 font-mono">₦5,000<span className="text-[10px] text-slate-400 font-normal">/mo</span></span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                            Empowers wedding bakers, luxury cake custom artists, and boutique brands to secure high value orders.
                          </p>
                          
                          <hr className="border-slate-100" />
                          
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">✨ what you unlock:</div>
                          <ul className="space-y-2 text-[11px] text-slate-600 text-left font-medium">
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              <span className="text-slate-800 font-black">Unlimited image scans &amp; detailed vision reports</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              <span>Accurate pricing suggestions based on your level</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              <span className="text-slate-800 font-bold">Profit visibility — know what you’re really earning</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              <span>Smarter market-adjusted pricing (Lagos/Abuja norms)</span>
                            </li>
                            <li className="flex items-start gap-1.5 animate-pulse">
                              <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              <span className="text-indigo-950 font-extrabold text-[10.5px]">Priority AI processing (faster, better results)</span>
                            </li>
                          </ul>
                        </div>

                        <div className="mt-6 pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanTab('monthly');
                              setPaymentPlanToCheckout('premium_monthly');
                            }}
                            className={`w-full text-center text-xs py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 font-black active:scale-95 ${
                              selectedPlanTab === 'monthly'
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                                : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200'
                            }`}
                            id="plan_btn_premium"
                          >
                            <Crown className="w-3.5 h-3.5 text-yellow-300" />
                            Upgrade to Premium
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Trust-building microcopy */}
                    <div className="mt-6 text-center bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl max-w-xl mx-auto flex items-center justify-center gap-2 shadow-2xs">
                      <span className="text-sm">🔒</span>
                      <p className="text-xs font-semibold text-slate-500">
                        Payments are securely processed by <span className="font-extrabold text-slate-700">Testibites Cakes N’ Pastries</span>
                      </p>
                    </div>
                  </>
                )}

                {/* Closing quote */}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-xs font-semibold text-slate-700 italic">
                    {inputs.businessLevel === 'Premium' 
                      ? "“You’re not a small baker anymore — don’t price like one. Upgrade to Pro and price at your true value.”"
                      : "“Whether you're a beginner or a premium baker, CakeWise helps you price like a professional.”"}
                  </p>
                </div>

                {/* Footer disclaimer */}
                <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed max-w-xl mx-auto">
                  💡 No physical bank card or billing credentials are required for this sandboxed build. All feature toggles are simulated directly within this container environment for evaluation purposes.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🧑‍🍳 PROFILE / SETTINGS MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="fixed inset-0 bg-slate-900/85 backdrop-blur-xs"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] border border-slate-200 z-10 overflow-hidden flex flex-col relative"
              id="profile_modal_panel"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 p-2 rounded-full transition-colors cursor-pointer active:scale-95 z-20"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 text-left space-y-6" id="profile_modal_scroll_content">
                {/* Header */}
                <div className="text-center space-y-1.5 border-b border-slate-100 pb-4">
                  <div className="mx-auto bg-pink-100 text-pink-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
                    🧑‍🍳
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Your Baker Profile & Settings</h3>
                  <p className="text-xs text-slate-400">Manage your workspace calibrations & credentials</p>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-pink-500" /> Baker / Business Name
                    </label>
                    <input
                      type="text"
                      value={bakerName}
                      onChange={(e) => setBakerName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-pink-200 focus:border-pink-500 px-3.5 py-3 rounded-xl focus:outline-hidden transition-all text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-pink-500" /> Account Email
                    </label>
                    <input
                      type="email"
                      value={bakerEmail}
                      onChange={(e) => setBakerEmail(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-pink-200 focus:border-pink-500 px-3.5 py-3 rounded-xl focus:outline-hidden transition-all text-slate-800"
                    />
                  </div>

                  {/* Business level */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Select Your Business Level
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { value: 'Beginner', title: 'Beginner Baker', desc: 'Home baker, simple cakes, tight budgets' },
                        { value: 'Growing', title: 'Growing Business', desc: 'Regular customers, custom work, scaling up' },
                        { value: 'Premium', title: 'Premium / Luxury Baker', desc: 'Luxury tiers, wedding cakes, elite branding' }
                      ].map((tier) => {
                        const isActive = inputs.businessLevel === tier.value;
                        return (
                          <button
                            key={tier.value}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, businessLevel: tier.value as any }))}
                            className={`text-left border rounded-xl p-3 transition-all cursor-pointer flex items-center justify-between hover:shadow-2xs ${
                              isActive
                                ? 'border-pink-500 bg-pink-50/25 text-pink-900 shadow-3xs ring-1 ring-pink-400'
                                : 'border-slate-200 hover:border-pink-100 bg-white text-slate-700'
                            }`}
                          >
                            <div>
                              <p className="font-extrabold text-xs">{tier.title}</p>
                              <p className="text-[10px] text-slate-400">{tier.desc}</p>
                            </div>
                            {isActive && (
                              <div className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center text-white shrink-0">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Active Billing Status
                    </label>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isPremiumUser ? (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-xs font-bold text-slate-800">
                          {isPremiumUser ? 'CakeWise Premium Active' : 'Free Sandbox Account'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileModal(false);
                          setShowPricingModal(true);
                        }}
                        className="text-[10px] font-black uppercase text-indigo-600 hover:underline cursor-pointer"
                      >
                        {isPremiumUser ? 'Manage Plans' : 'Upgrade Plan'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Powered by Testibites Cakes N’ Pastries Section */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-pink-50/30 border border-indigo-100/50 p-4 rounded-2xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 text-white p-1 rounded-lg">
                      <Cake className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-black text-slate-800">
                      Powered by Testibites Cakes N’ Pastries
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                    CakeWise is built and powered in proud partnership with <span className="font-bold text-slate-700">Testibites Cakes N’ Pastries</span>. Calibration templates, ingredient weight standards, and pricing algorithms are constantly audited against premier Nigerian market levels to ensure your micro-bakery commands true, sustainable profit.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-3 rounded-xl transition-all shadow-sm text-center cursor-pointer active:scale-95"
                  >
                    Save & Close Settings
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

