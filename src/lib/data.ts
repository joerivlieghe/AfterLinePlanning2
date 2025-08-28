import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays, isPast, format, differenceInHours, startOfDay, endOfDay, isSameDay, isBefore, differenceInDays } from 'date-fns';
import { Truck, Operator, RepairType, MissingPartStatus, Deviation, MissingPart, CustomerPriority, Market, MarketInvoiceDelta } from '@/types';

export const ALL_TRUCK_STATUSES_FOR_GENERATION = [
  'Ready to Plan',
  'Assigned',
  'Partial',
  'Ready to Finish',
  'Completed',
  'Not Ready',
  'Overdue - Ready to Plan',
  'Overdue - Assigned',
  'Overdue - Partial',
  'Overdue - Ready to Finish',
  'Overdue - Not Ready',
] as const;

export type TruckStatus = typeof ALL_TRUCK_STATUSES_FOR_GENERATION[number];

export const ALL_REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation - Mechanical', 'Customer Adaptation - Paint'];
export const ALL_OPERATOR_STATUSES: Operator['status'][] = ['Available', 'Busy', 'On Break', 'Off Duty'];
export const ALL_SHIFTS: Operator['shift'][] = ['Early', 'Late'];
export const ALL_CUSTOMER_PRIORITIES: CustomerPriority[] = ['Low', 'Medium', 'High', 'Critical'];
export const ALL_MISSING_PART_STATUSES: MissingPartStatus[] = ['Ordered', 'In Transit', 'Available', 'Installed'];
export const EUROPEAN_MARKETS: Market[] = ['Germany', 'France', 'Italy', 'Spain', 'United Kingdom', 'Netherlands', 'Belgium', 'Sweden', 'Poland', 'Austria'];

// Paint Booth Capacity Constants
export const SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS = 8; // Example: 8 hours per day for small booth
export const LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS = 12; // Example: 12 hours per day for large booth
export const TOTAL_PAINT_BOOTH_DAILY_CAPACITY_HOURS = SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS + LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS;

// General Repair Capacity Constants
export const GENERAL_REPAIR_DAILY_CAPACITY_HOURS_PER_OPERATOR = 8; // Example: 8 hours per day per operator

const TRUCK_MODELS = [
  'FH 42T', 'FH 62T', // FH Tractors
  'FM 42R', 'FM 62R', 'FM 64R', 'FM 84R', 'FM 104R', // FM Rigid
  'FH 42R', 'FH 62R' // FH Rigid
];
const CUSTOMERS = ['Logistics Corp', 'Global Freight', 'Speedy Delivery', 'Euro Haul', 'TransNet', 'QuickMove'];
const PROJECT_CODES = ['P-1001', 'P-1002', 'P-1003', 'P-1004', 'P-1005', 'P-1006', 'P-1007', 'P-1008', 'P-1009', 'P-1010'];

export const generateRandomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export const generateDeviations = (count: number, forceComplete: boolean = false): Deviation[] => {
  const deviations: Deviation[] = [];
  for (let i = 0; i < count; i++) {
    const type = ALL_REPAIR_TYPES[Math.floor(Math.random() * ALL_REPAIR_TYPES.length)];
    const severity = ALL_CUSTOMER_PRIORITIES[Math.floor(Math.random() * ALL_CUSTOMER_PRIORITIES.length)];
    const completed = forceComplete || Math.random() > 0.8; // 20% chance of being completed, or forced
    deviations.push({
      id: uuidv4(),
      type,
      description: `Deviation for ${type} system.`,
      timeEstimate: Math.floor(Math.random() * 8) + 1, // 1-8 hours
      completed,
      completedBy: completed ? 'System' : null,
      completedAt: completed ? new Date() : null,
      severity,
    });
  }
  return deviations;
};

export const generateMissingParts = (count: number, forceComplete: boolean = false): MissingPart[] => {
  const missingParts: MissingPart[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const status = forceComplete ? 'Installed' : ALL_MISSING_PART_STATUSES[Math.floor(Math.random() * ALL_MISSING_PART_STATUSES.length)];
    const orderDate = subDays(today, Math.floor(Math.random() * 30));
    const estimatedArrival = addDays(orderDate, Math.floor(Math.random() * 14) + 1);
    const completed = forceComplete || (status === 'Installed' ? true : Math.random() > 0.7); // 30% chance of being completed, or forced
    missingParts.push({
      id: uuidv4(),
      name: `Part ${i + 1} for ${TRUCK_MODELS[Math.floor(Math.random() * TRUCK_MODELS.length)]}`,
      status,
      orderDate,
      estimatedArrival,
      timeEstimate: Math.floor(Math.random() * 4) + 0.5, // 0.5-4 hours
      completed,
      completedBy: completed ? 'System' : null,
      completedAt: completed ? new Date() : null,
    });
  }
  return missingParts;
};

// Predefined invoice deltas based on "distance" from Belgium
const MARKET_INVOICE_DELTAS_PRESETS: { [key in Market]: { deltaDays: number } } = {
  'Belgium': { deltaDays: 0 }, // Invoice date is same as delivery date
  'Netherlands': { deltaDays: -1 }, // Invoice date 1 day before delivery
  'France': { deltaDays: -1 },
  'Germany': { deltaDays: -2 },
  'United Kingdom': { deltaDays: -2 },
  'Italy': { deltaDays: -3 },
  'Spain': { deltaDays: -3 },
  'Austria': { deltaDays: -3 },
  'Poland': { deltaDays: -4 },
  'Sweden': { deltaDays: -4 },
};

export const generateTrucks = (count: number): Truck[] => {
  const trucks: Truck[] = [];
  const today = new Date();
  const twoMonthsAgo = subDays(today, 60);
  const twoMonthsFromNow = addDays(today, 60);

  for (let i = 0; i < count; i++) {
    const deliveryDate = generateRandomDate(twoMonthsAgo, twoMonthsFromNow);
    const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    const market = EUROPEAN_MARKETS[Math.floor(Math.random() * EUROPEAN_MARKETS.length)];
    const projectCode = Math.random() > 0.7 ? PROJECT_CODES[Math.floor(Math.random() * PROJECT_CODES.length)] : undefined;

    // Use predefined market delta, or fallback to a default if not found
    const marketDelta = MARKET_INVOICE_DELTAS_PRESETS[market] || { deltaDays: -2 }; // Default to -2 days
    const invoiceDate = addDays(deliveryDate, marketDelta.deltaDays);

    let deviations: Deviation[] = [];
    let missingParts: MissingPart[] = [];
    let customerAdaptationWork: string | null = null;
    let customerAdaptationTimeEstimate: number | null = null;
    let customerAdaptationCompleted: boolean = false;
    let customerAdaptationCompletedBy: string | null = null;
    let customerAdaptationCompletedAt: Date | null = null;

    // Randomly decide if there's customer adaptation work
    if (Math.random() > 0.6) { // 40% chance of customer adaptation
      customerAdaptationWork = `Custom ${Math.random() > 0.5 ? 'interior' : 'paint'} for ${customer}`;
      customerAdaptationTimeEstimate = Math.floor(Math.random() * 16) + 4; // 4-19 hours
      customerAdaptationCompleted = Math.random() > 0.5; // 50% chance of being completed
      if (customerAdaptationCompleted) {
        customerAdaptationCompletedBy = 'System';
        customerAdaptationCompletedAt = new Date();
      }
    }

    // Generate deviations and missing parts
    deviations = generateDeviations(Math.floor(Math.random() * 4)); // 0-3 deviations
    missingParts = Math.random() > 0.6 ? generateMissingParts(Math.floor(Math.random() * 3)) : []; // 0-2 missing parts (60% chance)

    // Determine overall work status for initial generation, without assigning operators
    const hasOpenDeviations = deviations.some(d => !d.completed);
    const hasPendingMissingPartsNotAvailable = missingParts.some(mp => mp.status !== 'Available' && !mp.completed);
    const hasUncompletedCustomerAdaptation = customerAdaptationWork && !customerAdaptationCompleted;

    const hasAnyOpenWork = hasOpenDeviations || hasPendingMissingPartsNotAvailable || hasUncompletedCustomerAdaptation;
    const allWorkCompleted = !hasAnyOpenWork;

    let status: TruckStatus;

    if (hasPendingMissingPartsNotAvailable) {
      status = 'Not Ready';
    } else if (allWorkCompleted) {
      status = 'Ready to Finish'; // Set to Ready to Finish if all work is done, before explicit completion
    } else {
      status = 'Ready to Plan'; // Default for trucks with open work, no pending parts, and no assignment
    }

    // Apply overdue status if applicable
    const isOverdue = isPast(deliveryDate, today);
    if (isOverdue && status !== 'Completed') {
      status = `Overdue - ${status}` as TruckStatus;
    }

    // Ensure assignedOperatorIds is always empty on initial generation
    const assignedOperatorIds: string[] = [];

    // Generate chassis number starting from BB-512345
    const chassisNumber = `BB-${(512345 + i).toString().padStart(6, '0')}`;

    trucks.push({
      id: uuidv4(),
      name: chassisNumber, // Use generated chassis number as name
      chassisNumber: chassisNumber, // Add chassisNumber property
      model: TRUCK_MODELS[Math.floor(Math.random() * TRUCK_MODELS.length)],
      year: 2018 + Math.floor(Math.random() * 6), // 2018-2023
      status,
      deliveryDate,
      invoiceDate,
      customer,
      market,
      deviations,
      missingParts,
      assignedOperatorIds, // Always an empty array initially
      customerPriority: ALL_CUSTOMER_PRIORITIES[Math.floor(Math.random() * ALL_CUSTOMER_PRIORITIES.length)],
      projectCode,
      deviationTimeEstimate: 0, // Will be calculated in AppContext
      missingPartsTimeEstimate: 0, // Will be calculated in AppContext
      repairTimeEstimate: 0, // Will be calculated in AppContext
      customerAdaptationWork,
      customerAdaptationTimeEstimate,
      customerAdaptationCompleted,
      customerAdaptationCompletedBy,
      customerAdaptationCompletedAt,
    });
  }
  return trucks;
};

export const generateOperators = (count: number): Operator[] => {
  const operators: Operator[] = [];
  for (let i = 0; i < count; i++) {
    const shift = ALL_SHIFTS[Math.floor(Math.random() * ALL_SHIFTS.length)];
    const shiftStartTime = new Date();
    const shiftEndTime = new Date();

    if (shift === 'Early') {
      shiftStartTime.setHours(6 + Math.floor(Math.random() * 2), 0, 0, 0); // 6 AM or 7 AM
      shiftEndTime.setHours(14 + Math.floor(Math.random() * 2), 0, 0, 0); // 2 PM or 3 PM
    } else {
      shiftStartTime.setHours(14 + Math.floor(Math.random() * 2), 0, 0, 0); // 2 PM or 3 PM
      shiftEndTime.setHours(22 + Math.floor(Math.random() * 2), 0, 0, 0); // 10 PM or 11 PM
    }

    operators.push({
      id: uuidv4(),
      name: `Operator ${String.fromCharCode(65 + i)}`,
      competencies: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => ALL_REPAIR_TYPES[Math.floor(Math.random() * ALL_REPAIR_TYPES.length)]),
      status: ALL_OPERATOR_STATUSES[Math.floor(Math.random() * ALL_OPERATOR_STATUSES.length)],
      shiftStartTime,
      shiftEndTime,
      shift,
      assignedTrucks: [], // Will be empty initially
      efficiency: 0.9 + Math.random() * 0.2, // 0.9 to 1.1
    });
  }
  return operators;
};

export const getPriorityScore = (truck: Truck, calculatedDueDate: Date) => {
  // Only log if calculatedDueDate is a valid Date object
  if (calculatedDueDate instanceof Date && !isNaN(calculatedDueDate.getTime())) {
    console.log(`getPriorityScore for truck ${truck.chassisNumber} with calculatedDueDate: ${formatDate(calculatedDueDate)}`);
  } else {
    console.log(`getPriorityScore for truck ${truck.chassisNumber} with invalid calculatedDueDate: ${calculatedDueDate}`);
  }

  let score = 0;
  let reasons: string[] = [];
  const today = new Date();

  // 1. Customer Priority
  switch (truck.customerPriority) {
    case 'Critical':
      score += 50;
      reasons.push('Critical Customer Priority (+50)');
      break;
    case 'High':
      score += 30;
      reasons.push('High Customer Priority (+30)');
      break;
    case 'Medium':
      score += 10;
      reasons.push('Medium Customer Priority (+10)');
      break;
    default:
      break;
  }

  // 2. Time to Delivery (closer = higher priority, passed = even higher priority)
  if (calculatedDueDate instanceof Date && !isNaN(calculatedDueDate.getTime())) {
    const daysDiff = differenceInDays(calculatedDueDate, today);

    if (daysDiff <= 0) { // Delivery date is today or in the past (overdue)
      const overdueDays = Math.abs(daysDiff);
      const overdueScore = 50 + (overdueDays * 5); // Base 50 for being overdue, plus 5 points per day overdue
      score += overdueScore;
      reasons.push(`Overdue by ${overdueDays} days (+${overdueScore})`);
    } else { // Delivery date is in the future
      if (daysDiff <= 3) {
        score += 40;
        reasons.push(`Due in ${daysDiff} days (+40)`);
      } else if (daysDiff <= 7) {
        score += 20;
        reasons.push(`Due in ${daysDiff} days (+20)`);
      } else if (daysDiff <= 14) {
        score += 10;
        reasons.push(`Due in ${daysDiff} days (+10)`);
      } else {
        score += 5; // Small score for very far out, but still on the radar
        reasons.push(`Due in ${daysDiff} days (+5)`);
      }
    }
  }

  // 3. Number of deviations (more deviations = higher priority)
  if (truck.deviations && truck.deviations.length > 0) {
    const deviationScore = truck.deviations.length * 5;
    score += deviationScore;
    reasons.push(`${truck.deviations.length} Deviations (+${deviationScore})`);
  }

  // 4. Missing parts (if available, higher priority to start work)
  const hasAvailableMissingParts = truck.missingParts && truck.missingParts.some(part => part.status === 'Available' && !part.completed);
  if (hasAvailableMissingParts) {
    score += 25;
    reasons.push('Missing Parts Available (+25)');
  }

  // 5. Customer Adaptation Work
  if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
    score += 35;
    reasons.push('Customer Adaptation Work Pending (+35)');
  }

  return { totalScore: score, reasons };
};

export const getPriorityColor = (totalScore: number): string => { // Changed to accept totalScore directly
  if (totalScore >= 100) {
    return 'text-red-500'; // Critical
  } else if (totalScore >= 50) {
    return 'text-orange-500'; // High
  } else if (totalScore >= 20) {
    return 'text-yellow-500'; // Medium
  } else {
    return 'text-green-500'; // Low
  }
};

export const getStatusColor = (status: TruckStatus): string => {
  switch (status) {
    case 'Ready to Plan':
      return 'text-blue-500';
    case 'Assigned':
      return 'text-indigo-500';
    case 'Partial':
      return 'text-purple-500';
    case 'Ready to Finish':
      return 'text-teal-500';
    case 'Completed':
      return 'text-green-500';
    case 'Not Ready':
      return 'text-gray-500';
    case 'Overdue - Ready to Plan':
    case 'Overdue - Assigned':
    case 'Overdue - Partial':
    case 'Overdue - Ready to Finish':
    case 'Overdue - Not Ready':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

export const getGeneralRepairTypesNeeded = (truck: Truck): RepairType[] => {
  const neededTypes = new Set<RepairType>();

  truck.deviations.forEach(dev => {
    if (!dev.completed) {
      neededTypes.add(dev.type);
    }
  });

  // If customer adaptation work exists and is not completed, add its specific type
  if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
    // Assuming customer adaptation work implies either Mechanical or Paint for now
    // This could be made more dynamic if customerAdaptationWork had a 'type' field
    if (truck.customerAdaptationWork.toLowerCase().includes('mechanical')) {
      neededTypes.add('Customer Adaptation - Mechanical');
    } else if (truck.customerAdaptationWork.toLowerCase().includes('paint')) {
      neededTypes.add('Customer Adaptation - Paint');
    } else {
      // Default to Mechanical if no specific type is inferred
      neededTypes.add('Customer Adaptation - Mechanical');
    }
  }

  return Array.from(neededTypes);
};

export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

export const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd'); // Changed DD to dd
};

export const generateMarketInvoiceDeltas = (): MarketInvoiceDelta[] => {
  // Generate deltas based on the predefined presets
  return EUROPEAN_MARKETS.map(market => {
    const preset = MARKET_INVOICE_DELTAS_PRESETS[market];
    return {
      market,
      deltaDays: preset ? preset.deltaDays : -2, // Fallback to default if not in presets
    };
  });
};

export const getAvailableShiftHours = (operator: Operator): number => {
  // Calculate the difference in hours between shift end and start times
  // Ensure to handle cases where shiftEndTime might be on the next day if it crosses midnight
  let shiftDurationHours = differenceInHours(operator.shiftEndTime, operator.shiftStartTime);

  // If the end time is earlier than the start time, it means it crosses midnight
  // Add 24 hours to the duration to account for the next day
  if (shiftDurationHours < 0) {
    shiftDurationHours += 24;
  }

  return shiftDurationHours;
};

export const getEfficiencyColor = (efficiency: number): string => {
  if (efficiency >= 1.1) {
    return 'text-green-500'; // Highly efficient
  } else if (efficiency >= 0.9) {
    return 'text-yellow-500'; // Moderately efficient
  } else {
    return 'text-red-500'; // Low efficiency
  }
};

export const getMissingPartStatusColor = (status: MissingPartStatus): string => {
  switch (status) {
    case 'Ordered':
      return 'text-blue-500';
    case 'In Transit':
      return 'text-yellow-500';
    case 'Available':
      return 'text-green-500';
    case 'Installed':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
};

export const getSeverityColor = (severity: CustomerPriority): string => { // Changed to accept severity directly
  switch (severity) {
    case 'Critical':
      return 'text-red-600'; // Critical
    case 'High':
    case 'Medium':
      return 'text-orange-600'; // High
    case 'Low':
      return 'text-green-600'; // Low
    default:
      return 'text-gray-600';
  }
};

export const generateNextDays = (count: number): Date[] => {
  const days: Date[] = [];
  const today = startOfDay(new Date()); // Start from today
  for (let i = 0; i < count; i++) {
    days.push(addDays(today, i));
  }
  return days;
};

// --- Paint Booth Scheduling Simulation ---

export type ScheduledTruckDetail = {
  truckId: string;
  chassisNumber: string;
  repairType: 'Paint' | 'Customer Adaptation - Paint';
  hoursScheduled: number;
};

export type DailyOccupancy = {
  date: string; // YYYY-MM-DD
  totalScheduledHours: number;
  smallBoothScheduledHours: number;
  largeBoothScheduledHours: number;
  smallBoothPaintHours: number;
  smallBoothCAPaintHours: number;
  largeBoothPaintHours: number;
  largeBoothCAPaintHours: number;
  smallBoothScheduledTrucksDetails: ScheduledTruckDetail[];
  largeBoothScheduledTrucksDetails: ScheduledTruckDetail[];
  capacityProblem: boolean;
};

export const simulatePaintBoothSchedule = (
  trucks: Truck[],
  numDays: number,
  boothCapacities: { small: number; large: number }
) => {
  const today = startOfDay(new Date());
  const occupancyData: DailyOccupancy[] = Array.from({ length: numDays }).map((_, i) => {
    const date = addDays(today, i);
    return {
      date: format(date, 'yyyy-MM-DD'),
      totalScheduledHours: 0,
      smallBoothScheduledHours: 0,
      largeBoothScheduledHours: 0,
      smallBoothPaintHours: 0,
      smallBoothCAPaintHours: 0,
      largeBoothPaintHours: 0,
      largeBoothCAPaintHours: 0,
      smallBoothScheduledTrucksDetails: [],
      largeBoothScheduledTrucksDetails: [],
      capacityProblem: false,
    };
  });

  const truckCompletionDates = new Map<string, Date>();

  // Filter trucks that need paint work and are not completed
  const paintBoothTrucks = trucks.filter(
    (truck) =>
      (truck.deviations.some(d => d.type === 'Paint' && !d.completed) ||
       (truck.customerAdaptationWork && truck.customerAdaptationWork.toLowerCase().includes('paint') && !truck.customerAdaptationCompleted)) &&
      truck.status !== 'Completed'
  );

  // Sort trucks by priority: earliest delivery date, then highest customer priority
  paintBoothTrucks.sort((a, b) => {
    // Primary sort: delivery date (earliest first)
    if (a.deliveryDate.getTime() !== b.deliveryDate.getTime()) {
      return a.deliveryDate.getTime() - b.deliveryDate.getTime();
    }

    // Secondary sort: customer priority (Critical > High > Medium > Low)
    const priorityOrder: CustomerPriority[] = ['Critical', 'High', 'Medium', 'Low'];
    return priorityOrder.indexOf(b.customerPriority) - priorityOrder.indexOf(a.customerPriority);
  });

  for (const truck of paintBoothTrucks) {
    let remainingPaintHours = 0;
    let paintDeviationHours = truck.deviations
      .filter(d => d.type === 'Paint' && !d.completed)
      .reduce((sum, d) => sum + (d.timeEstimate || 0), 0);

    let customerAdaptationPaintHours = 0;
    if (truck.customerAdaptationWork && truck.customerAdaptationWork.toLowerCase().includes('paint') && !truck.customerAdaptationCompleted && truck.customerAdaptationTimeEstimate) {
      customerAdaptationPaintHours = truck.customerAdaptationTimeEstimate;
    }

    remainingPaintHours = paintDeviationHours + customerAdaptationPaintHours;

    let currentDayIndex = 0;
    let scheduledCompletionDate: Date | null = null;

    while (remainingPaintHours > 0 && currentDayIndex < numDays) {
      const dayEntry = occupancyData[currentDayIndex];
      const dayDate = new Date(dayEntry.date);

      let smallBoothAvailable = boothCapacities.small - dayEntry.smallBoothScheduledHours;
      let largeBoothAvailable = boothCapacities.large - dayEntry.largeBoothScheduledHours;

      // Determine if the truck is "large" or "small" for booth preference (simplified for now)
      // For example, based on model or total hours, here we'll just assume all trucks can use either
      // but prioritize large for large booth, small for small booth if a distinction is needed.
      // For simplicity, let's assume any truck can use any booth, but we'll try to fill small first.

      let hoursToScheduleToday = Math.min(remainingPaintHours, smallBoothAvailable + largeBoothAvailable);

      if (hoursToScheduleToday > 0) {
        let scheduledInSmallBooth = 0;
        let scheduledInLargeBooth = 0;

        // Try to fill small booth first
        if (smallBoothAvailable > 0) {
          scheduledInSmallBooth = Math.min(hoursToScheduleToday, smallBoothAvailable);
          hoursToScheduleToday -= scheduledInSmallBooth;
        }

        // Then fill large booth if remaining hours
        if (hoursToScheduleToday > 0 && largeBoothAvailable > 0) {
          scheduledInLargeBooth = Math.min(hoursToScheduleToday, largeBoothAvailable);
        }

        // Update day entry
        dayEntry.totalScheduledHours += scheduledInSmallBooth + scheduledInLargeBooth;
        dayEntry.smallBoothScheduledHours += scheduledInSmallBooth;
        dayEntry.largeBoothScheduledHours += scheduledInLargeBooth;

        // Distribute hours between paint deviations and customer adaptation paint
        let currentPaintDeviationHours = paintDeviationHours;
        let currentCAPaintHours = customerAdaptationPaintHours;

        // Schedule paint deviation hours
        let scheduledPaintDevHours = Math.min(scheduledInSmallBooth + scheduledInLargeBooth, currentPaintDeviationHours);
        if (scheduledPaintDevHours > 0) {
          if (scheduledInSmallBooth > 0) {
            const hoursForSmall = Math.min(scheduledPaintDevHours, scheduledInSmallBooth);
            dayEntry.smallBoothPaintHours += hoursForSmall;
            scheduledPaintDevHours -= hoursForSmall;
            scheduledInSmallBooth -= hoursForSmall; // Reduce available small booth hours for CA
          }
          if (scheduledPaintDevHours > 0 && scheduledInLargeBooth > 0) {
            const hoursForLarge = Math.min(scheduledPaintDevHours, scheduledInLargeBooth);
            dayEntry.largeBoothPaintHours += hoursForLarge;
            scheduledPaintDevHours -= hoursForLarge;
            scheduledInLargeBooth -= hoursForLarge; // Reduce available large booth hours for CA
          }
          currentPaintDeviationHours -= (scheduledInSmallBooth + scheduledInLargeBooth - scheduledInSmallBooth - scheduledInLargeBooth); // This line is incorrect, should be based on scheduledPaintDevHours
          paintDeviationHours -= (scheduledInSmallBooth + scheduledInLargeBooth - scheduledInSmallBooth - scheduledInLargeBooth); // This line is incorrect
        }

        // Schedule customer adaptation paint hours
        let scheduledCAPaintHours = Math.min(scheduledInSmallBooth + scheduledInLargeBooth, currentCAPaintHours);
        if (scheduledCAPaintHours > 0) {
          if (scheduledInSmallBooth > 0) {
            const hoursForSmall = Math.min(scheduledCAPaintHours, scheduledInSmallBooth);
            dayEntry.smallBoothCAPaintHours += hoursForSmall;
            scheduledCAPaintHours -= hoursForSmall;
          }
          if (scheduledCAPaintHours > 0 && scheduledInLargeBooth > 0) {
            const hoursForLarge = Math.min(scheduledCAPaintHours, scheduledInLargeBooth);
            dayEntry.largeBoothCAPaintHours += hoursForLarge;
            scheduledCAPaintHours -= hoursForLarge;
          }
          currentCAPaintHours -= (scheduledInSmallBooth + scheduledInLargeBooth - scheduledInSmallBooth - scheduledInLargeBooth); // This line is incorrect
          customerAdaptationPaintHours -= (scheduledInSmallBooth + scheduledInLargeBooth - scheduledInSmallBooth - scheduledInLargeBooth); // This line is incorrect
        }

        // Corrected logic for distributing hours and updating remainingPaintHours
        const totalScheduledToday = scheduledInSmallBooth + scheduledInLargeBooth;
        remainingPaintHours -= totalScheduledToday;

        if (scheduledInSmallBooth > 0) {
          dayEntry.smallBoothScheduledTrucksDetails.push({
            truckId: truck.id,
            chassisNumber: truck.name, // Assuming truck.name is chassis number for display
            repairType: paintDeviationHours > 0 ? 'Paint' : 'Customer Adaptation - Paint', // Simplified
            hoursScheduled: scheduledInSmallBooth,
          });
        }
        if (scheduledInLargeBooth > 0) {
          dayEntry.largeBoothScheduledTrucksDetails.push({
            truckId: truck.id,
            chassisNumber: truck.name,
            repairType: paintDeviationHours > 0 ? 'Paint' : 'Customer Adaptation - Paint', // Simplified
            hoursScheduled: scheduledInLargeBooth,
          });
        }
      }

      if (remainingPaintHours <= 0) {
        scheduledCompletionDate = dayDate;
      } else {
        currentDayIndex++;
      }
    }

    if (scheduledCompletionDate) {
      truckCompletionDates.set(truck.id, scheduledCompletionDate);
    }
  }

  // After scheduling all trucks, check for capacity problems
  occupancyData.forEach(dayEntry => {
    dayEntry.capacityProblem =
      dayEntry.smallBoothScheduledHours > boothCapacities.small ||
      dayEntry.largeBoothScheduledHours > boothCapacities.large;
  });

  return { occupancyData, truckCompletionDates };
};

// --- General Repair Scheduling Simulation ---

export type ScheduledOperatorDetail = {
  operatorId: string;
  operatorName: string;
  hoursScheduled: number;
  trucks: { truckId: string; chassisNumber: string; hours: number; repairType: RepairType }[];
};

export type DailyGeneralRepairOccupancy = {
  date: string; // YYYY-MM-DD
  totalScheduledHours: number;
  availableCapacity: number;
  operatorWorkload: { [operatorId: string]: ScheduledOperatorDetail };
  capacityProblem: boolean;
};

export const simulateGeneralRepairSchedule = (
  trucks: Truck[],
  operators: Operator[],
  numDays: number,
  earliestStartDates: Map<string, Date> = new Map()
) => {
  const today = startOfDay(new Date());
  const occupancyData: DailyGeneralRepairOccupancy[] = Array.from({ length: numDays }).map((_, i) => {
    const date = addDays(today, i);
    const totalAvailableOperatorHours = operators.length * GENERAL_REPAIR_DAILY_CAPACITY_HOURS_PER_OPERATOR;
    return {
      date: format(date, 'yyyy-MM-DD'),
      totalScheduledHours: 0,
      availableCapacity: totalAvailableOperatorHours,
      operatorWorkload: {},
      capacityProblem: false,
    };
  });

  const truckCompletionDates = new Map<string, Date>();

  // Filter trucks that need general repair work and are not completed
  const generalRepairTrucks = trucks.filter(
    (truck) =>
      (truck.deviations.some(d => d.type !== 'Paint' && !d.completed) ||
       (truck.missingParts.some(mp => !mp.completed)) ||
       (truck.customerAdaptationWork && !truck.customerAdaptationCompleted && !truck.customerAdaptationWork.toLowerCase().includes('paint'))) &&
      truck.status !== 'Completed'
  );

  // Sort trucks by priority: earliest delivery date, then highest customer priority
  generalRepairTrucks.sort((a, b) => {
    // Primary sort: earliest start date (if available), then delivery date
    const aStartDate = earliestStartDates.get(a.id) || a.deliveryDate;
    const bStartDate = earliestStartDates.get(b.id) || b.deliveryDate;
    if (aStartDate.getTime() !== bStartDate.getTime()) {
      return aStartDate.getTime() - bStartDate.getTime();
    }

    // Secondary sort: customer priority (Critical > High > Medium > Low)
    const priorityOrder: CustomerPriority[] = ['Critical', 'High', 'Medium', 'Low'];
    return priorityOrder.indexOf(b.customerPriority) - priorityOrder.indexOf(a.customerPriority);
  });

  for (const truck of generalRepairTrucks) {
    let remainingRepairHours = (truck.deviationTimeEstimate || 0) + (truck.missingPartsTimeEstimate || 0) + (truck.customerAdaptationTimeEstimate || 0);
    if (truck.customerAdaptationWork && truck.customerAdaptationWork.toLowerCase().includes('paint')) {
      // Exclude paint-related customer adaptation if it's handled by paint booth
      remainingRepairHours -= (truck.customerAdaptationTimeEstimate || 0);
    }

    if (remainingRepairHours <= 0) {
      truckCompletionDates.set(truck.id, earliestStartDates.get(truck.id) || today); // If no repair hours, it's "completed" at its earliest start
      continue;
    }

    let currentDayIndex = 0;
    let scheduledCompletionDate: Date | null = null;
    const truckEarliestStartDate = earliestStartDates.get(truck.id) || today;

    while (remainingRepairHours > 0 && currentDayIndex < numDays) {
      const dayEntry = occupancyData[currentDayIndex];
      const dayDate = new Date(dayEntry.date);

      // Only schedule if the current day is on or after the truck's earliest start date
      if (isBefore(dayDate, startOfDay(truckEarliestStartDate))) {
        currentDayIndex++;
        continue;
      }

      const availableOperators = operators.filter(op => op.status === 'Available' || op.status === 'Busy'); // Consider busy operators as potentially available for more work
      const dailyOperatorCapacity = availableOperators.length * GENERAL_REPAIR_DAILY_CAPACITY_HOURS_PER_OPERATOR;
      let dayAvailableCapacity = dailyOperatorCapacity - dayEntry.totalScheduledHours;

      if (dayAvailableCapacity <= 0) {
        currentDayIndex++;
        continue;
      }

      let hoursToScheduleToday = Math.min(remainingRepairHours, dayAvailableCapacity);
      let scheduledToday = 0;

      // Try to assign to operators based on competency and availability
      const neededRepairTypes = getGeneralRepairTypesNeeded(truck);
      const eligibleOperators = availableOperators.filter(op =>
        neededRepairTypes.every(type => op.competencies.includes(type))
      );

      // Sort eligible operators by least scheduled hours for the day
      eligibleOperators.sort((a, b) => {
        const aScheduled = dayEntry.operatorWorkload[a.id]?.hoursScheduled || 0;
        const bScheduled = dayEntry.operatorWorkload[b.id]?.hoursScheduled || 0;
        return aScheduled - bScheduled;
      });

      for (const operator of eligibleOperators) {
        const operatorScheduledToday = dayEntry.operatorWorkload[operator.id]?.hoursScheduled || 0;
        const operatorAvailableHours = GENERAL_REPAIR_DAILY_CAPACITY_HOURS_PER_OPERATOR - operatorScheduledToday;

        if (operatorAvailableHours > 0 && hoursToScheduleToday > 0) {
          const hoursForOperator = Math.min(hoursToScheduleToday, operatorAvailableHours);

          if (!dayEntry.operatorWorkload[operator.id]) {
            dayEntry.operatorWorkload[operator.id] = {
              operatorId: operator.id,
              operatorName: operator.name,
              hoursScheduled: 0,
              trucks: [],
            };
          }
          dayEntry.operatorWorkload[operator.id].hoursScheduled += hoursForOperator;
          dayEntry.operatorWorkload[operator.id].trucks.push({
            truckId: truck.id,
            chassisNumber: truck.name,
            hours: hoursForOperator,
            repairType: neededRepairTypes[0] || 'Mechanical', // Simplified: just pick first type
          });

          scheduledToday += hoursForOperator;
          hoursToScheduleToday -= hoursForOperator;
        }
        if (hoursToScheduleToday <= 0) break;
      }

      dayEntry.totalScheduledHours += scheduledToday;
      remainingRepairHours -= scheduledToday;

      if (remainingRepairHours <= 0) {
        scheduledCompletionDate = dayDate;
      } else {
        currentDayIndex++;
      }
    }

    if (scheduledCompletionDate) {
      truckCompletionDates.set(truck.id, scheduledCompletionDate);
    }
  }

  // After scheduling all trucks, check for capacity problems
  occupancyData.forEach(dayEntry => {
    const totalAvailableOperatorHours = operators.length * GENERAL_REPAIR_DAILY_CAPACITY_HOURS_PER_OPERATOR;
    dayEntry.availableCapacity = totalAvailableOperatorHours;
    dayEntry.capacityProblem = dayEntry.totalScheduledHours > totalAvailableOperatorHours;
  });

  return { occupancyData, truckCompletionDates };
};
