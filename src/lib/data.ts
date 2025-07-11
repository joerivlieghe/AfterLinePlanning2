import {
  Truck,
  Operator,
  RepairType,
  RepairArea,
  MissingPartStatus,
  OperatorStatus,
  Deviation,
  MissingPart,
  TruckStatus,
  Shift,
  ProposedAssignment,
  PaintBoothType,
  DailyPaintBoothOccupancy, // Import the updated interface
  ScheduledTruckDetail, // Import the updated interface
  DailyOperatorOccupancy, // Import the new interface
} from '@/types';
import { addDays, addHours, isBefore, isAfter, format, differenceInDays, isPast, setHours, setMinutes, setSeconds, setMilliseconds, startOfDay } from 'date-fns';

export const REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation - Mechanical', 'Customer Adaptation - Paint']; // Updated: Removed 'Customer Adaptation' (general)
const REPAIR_AREAS: RepairArea[] = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5', 'Bay 6'];
const MISSING_PART_STATUSES: MissingPartStatus[] = ['Ordered', 'In Transit', 'Available'];
const OPERATOR_STATUSES: OperatorStatus[] = ['Available', 'Busy', 'On Break', 'Off Duty'];
export const CUSTOMER_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const SHIFTS: Shift[] = ['Early', 'Late'];
const PAINT_COLORS: string[] = ['Metallic Blue', 'Glossy Black', 'Racing Red', 'Pearl White', 'Matte Grey', 'Forest Green'];
const PAINT_BOOTH_TYPES: PaintBoothType[] = ['Small', 'Large'];

// Define all possible truck statuses for generation
export const ALL_TRUCK_STATUSES_FOR_GENERATION: TruckStatus[] = [
  'Pending', 'In Progress', 'Partial', 'Completed', 'Overdue',
  'Missing Parts Not Available', 'Assigned', 'Ready to Finish',
  'Overdue - Not Ready', 'Not Ready', 'Overdue - Ready to Plan', 'Ready to Plan'
];

// Define a fixed set of project codes
const PROJECT_CODES: string[] = ['PROJ-ALPHA', 'PROJ-BETA', 'PROJ-GAMMA'];
const MAX_PROJECT_TRUCK_PERCENTAGE = 0.03; // 3%

// Paint Booth Capacities
export const SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS = 16; // Example: Small booth capacity
export const LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS = 16; // Example: Large booth capacity
export const TOTAL_PAINT_BOOTH_DAILY_CAPACITY_HOURS = SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS + LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS; // Combined total capacity

// General Repair Bay Capacities (conceptual - based on total operator hours)
export const GENERAL_REPAIR_DAILY_CAPACITY_HOURS_PER_OPERATOR = 8; // Assuming 8 productive hours per operator per day

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomRepairTime(min: number, max: number): number {
  const actualMin = Math.max(0.25, min);
  const range = (max - actualMin) * 4;
  const randomQuarters = Math.floor(Math.random() * (range + 1));
  return actualMin + randomQuarters * 0.25;
}

function getRandomDate(start: Date, end: Date): Date {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(time);
}

function generateDeviations(guaranteeOne: boolean = false): Deviation[] {
  const deviations: Deviation[] = [];
  let numDeviations = 0;

  if (guaranteeOne) {
    numDeviations = getRandomNumber(1, 2);
  } else {
    numDeviations = Math.random() < 0.6 ? getRandomNumber(0, 2) : 0;
  }

  for (let i = 0; i < numDeviations; i++) {
    deviations.push({
      id: `DEV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      description: getRandomElement([
        'Unable to mount engine bracket',
        'Faulty wiring in dashboard',
        'Software glitch in infotainment system',
        'Paint scratch on driver side door',
        'Loose connection in braking system',
        'Misaligned chassis component',
        'Sensor malfunction',
        'Hydraulic fluid leak',
        'Tire pressure monitoring error',
        'Seatbelt retraction issue',
      ]),
      severity: getRandomElement(['Low', 'Medium', 'High']),
      completed: false,
      completedBy: null,
      completedAt: null,
      timeEstimate: getRandomRepairTime(0.5, 2),
    });
  }
  return deviations;
}

function generateMissingParts(guaranteeOne: boolean = false, forceStatus?: MissingPartStatus): MissingPart[] {
  const missingParts: MissingPart[] = [];
  let numMissingParts = 0;

  if (guaranteeOne) {
    numMissingParts = getRandomNumber(1, 2);
  } else {
    numMissingParts = Math.random() < 0.5 ? getRandomNumber(0, 2) : 0;
  }

  for (let i = 0; i < numMissingParts; i++) {
    const status = forceStatus || getRandomElement(MISSING_PART_STATUSES);
    const promisedDeliveryDate = status === 'Available'
      ? new Date()
      : getRandomDate(addDays(new Date(), 1), addDays(new Date(), 14));
    missingParts.push({
      id: `PART-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      name: getRandomElement([
        'Engine Control Unit',
        'Headlight Assembly',
        'Brake Caliper',
        'Transmission Fluid Filter',
        'Side Mirror',
        'Dashboard Display',
        'Fuel Injector',
        'Alternator',
        'Radiator Hose',
        'Exhaust Manifold',
      ]),
      status: status,
      completed: false,
      completedBy: null,
      completedAt: null,
      promisedDeliveryDate: promisedDeliveryDate,
      timeEstimate: getRandomRepairTime(0.25, 1),
    });
  }
  return missingParts;
}

function inferRepairType(
  deviations: Deviation[],
  missingParts: MissingPart[],
  customerAdaptationType: Truck['customerAdaptationType']
): RepairType {
  if (customerAdaptationType === 'Mechanical') {
    return 'Customer Adaptation - Mechanical';
  }
  if (customerAdaptationType === 'Paint') {
    return 'Customer Adaptation - Paint';
  }

  const potentialTypes: RepairType[] = [];

  deviations.forEach(dev => {
    const desc = dev.description.toLowerCase();
    if (desc.includes('engine') || desc.includes('braking') || desc.includes('chassis') || desc.includes('hydraulic') || desc.includes('tire')) {
      potentialTypes.push('Mechanical');
    } else if (desc.includes('wiring') || desc.includes('sensor') || desc.includes('alternator') || desc.includes('dashboard')) {
      potentialTypes.push('Electrical');
    } else if (desc.includes('software') || desc.includes('infotainment')) {
      potentialTypes.push('Software');
    } else if (desc.includes('paint')) {
      potentialTypes.push('Paint');
    }
  });

  missingParts.forEach(part => {
    const name = part.name.toLowerCase();
    if (name.includes('engine') || name.includes('brake') || name.includes('transmission') || name.includes('radiator') || name.includes('exhaust')) {
      potentialTypes.push('Mechanical');
    } else if (name.includes('headlight') || name.includes('dashboard') || name.includes('sensor') || name.includes('alternator')) {
      potentialTypes.push('Electrical');
    }
  });

  if (potentialTypes.length > 0) {
    return getRandomElement(potentialTypes);
  }
  // Filter out all Customer Adaptation types for general repair type inference
  return getRandomElement(REPAIR_TYPES.filter(type => !type.startsWith('Customer Adaptation')));
}

/**
 * Infers the general repair types (Mechanical, Electrical, Software) needed for a truck
 * based on its deviations and missing parts, excluding paint-related work.
 * @param truck The truck to analyze.
 * @returns An array of RepairType strings representing the general repair competencies needed.
 */
export function getGeneralRepairTypesNeeded(truck: Truck): RepairType[] {
  const neededTypes: Set<RepairType> = new Set();

  truck.deviations.forEach(dev => {
    const desc = dev.description.toLowerCase();
    if (desc.includes('engine') || desc.includes('braking') || desc.includes('chassis') || desc.includes('hydraulic') || desc.includes('tire')) {
      neededTypes.add('Mechanical');
    } else if (desc.includes('wiring') || desc.includes('sensor') || desc.includes('alternator') || desc.includes('dashboard')) {
      neededTypes.add('Electrical');
    } else if (desc.includes('software') || desc.includes('infotainment')) {
      neededTypes.add('Software');
    }
    // Paint deviations are intentionally ignored here as this function is for general repair competencies
  });

  truck.missingParts.forEach(part => {
    const name = part.name.toLowerCase();
    if (name.includes('engine') || name.includes('brake') || name.includes('transmission') || name.includes('radiator') || name.includes('exhaust')) {
      neededTypes.add('Mechanical');
    } else if (name.includes('headlight') || name.includes('dashboard') || name.includes('sensor') || name.includes('alternator')) {
      neededTypes.add('Electrical');
    }
  });

  const generalRepairTypes = Array.from(neededTypes).filter(type =>
    !type.includes('Paint') && !type.startsWith('Customer Adaptation')
  );

  // If no specific types inferred but there's general repair time, assume 'Mechanical' as a fallback
  if (generalRepairTypes.length === 0 && ((truck.deviationTimeEstimate || 0) > 0 || (truck.missingPartsTimeEstimate || 0) > 0)) {
    return ['Mechanical']; // Fallback to a common general repair type
  }

  return generalRepairTypes;
}


export function generateTrucks(count: number): Truck[] {
  const trucks: Truck[] = [];
  const now = new Date();
  let chassisCounter = 512345;
  let projectTrucksCount = 0;
  const maxProjectTrucks = Math.floor(count * MAX_PROJECT_TRUCK_PERCENTAGE);

  // Determine how many trucks should be intentionally overdue (approx 5%)
  const targetOverdueCount = Math.floor(count * 0.05);
  let overdueTrucksGenerated = 0;

  for (let i = 0; i < count; i++) {
    let deviations: Deviation[] = [];
    let missingParts: MissingPart[] = [];
    let customerAdaptationWork: string | null = null;
    let customerAdaptationCompleted: boolean = false;
    let customerAdaptationType: Truck['customerAdaptationType'] = undefined;
    let paintDetails: Truck['paintDetails'] = undefined;
    let projectCode: string | undefined = undefined;
    let customerAdaptationTimeEstimate: number = 0;

    const includeDeviation = Math.random() < 0.8;
    const includeMissingPart = Math.random() < 0.7;
    const includeCustomerAdaptation = Math.random() < 0.5;

    // Assign project code only if maxProjectTrucks limit is not reached
    if (projectTrucksCount < maxProjectTrucks && Math.random() < 0.15) { // 15% chance to be a project truck, subject to overall limit
      projectCode = getRandomElement(PROJECT_CODES);
      projectTrucksCount++;
    }

    if (includeDeviation) {
      deviations = generateDeviations(true);
    } else {
      deviations = generateDeviations(false);
    }

    // Adjust missing parts generation to ensure more 'Available' parts initially
    if (includeMissingPart) {
      // 70% chance to have available parts, 30% for ordered/in transit
      const forceStatus = Math.random() < 0.7 ? 'Available' : getRandomElement(['Ordered', 'In Transit']);
      missingParts = generateMissingParts(true, forceStatus);
    } else {
      missingParts = generateMissingParts(false);
    }

    if (includeCustomerAdaptation) {
      const caTypes: Truck['customerAdaptationType'][] = ['Mechanical', 'Paint'];
      customerAdaptationType = getRandomElement(caTypes);

      if (customerAdaptationType === 'Mechanical') {
        customerAdaptationWork = getRandomElement([
          'Performance exhaust system installation',
          'Suspension upgrade for heavy duty',
          'Custom braking system integration',
        ]);
        customerAdaptationTimeEstimate = getRandomRepairTime(0.5, 2.5);
      } else if (customerAdaptationType === 'Paint') {
        customerAdaptationWork = getRandomElement([
          'Full vehicle repaint',
          'Custom stripe design application',
          'Rust repair and paint matching',
        ]);
        paintDetails = {
          color: getRandomElement(PAINT_COLORS),
          paintBoothType: getRandomElement(PAINT_BOOTH_TYPES),
        };
        customerAdaptationTimeEstimate = getRandomRepairTime(2, 12);
      }
      customerAdaptationCompleted = false;
    }

    // Determine the primary repair type and its associated time estimate
    let repairType: RepairType;
    let repairTimeEstimate: number;
    let deviationTimeEstimate: number = deviations.reduce((sum, dev) => sum + (dev.timeEstimate || 0), 0);
    let missingPartsTimeEstimate: number = missingParts.reduce((sum, part) => sum + (part.timeEstimate || 0), 0);

    if (customerAdaptationType) {
      repairType = customerAdaptationType === 'Mechanical' ? 'Customer Adaptation - Mechanical' : 'Customer Adaptation - Paint';
      repairTimeEstimate = customerAdaptationTimeEstimate;
      // If it's a CA truck, its primary repair time is the CA time.
      // Deviations/missing parts are secondary and might be handled separately or considered part of the CA work.
      // For simplicity, if CA exists, we prioritize its time estimate.
      // If a CA truck also has deviations/missing parts, their time estimates are still stored but not added to the primary repairTimeEstimate for this model.
    } else {
      repairType = inferRepairType(deviations, missingParts, customerAdaptationType);
      repairTimeEstimate = deviationTimeEstimate + missingPartsTimeEstimate;
    }

    // Ensure at least some work if none was generated
    if (repairTimeEstimate === 0) {
      const forcedWorkType = getRandomElement(['deviation', 'missingPart', 'customerAdaptation']);
      if (forcedWorkType === 'deviation') {
        const newDeviationTime = getRandomRepairTime(0.5, 1);
        deviations.push({
          id: `DEV-FORCE-${i}`,
          description: 'Minor check-up required',
          severity: 'Low',
          completed: false,
          completedBy: null,
          completedAt: null,
          timeEstimate: newDeviationTime,
        });
        deviationTimeEstimate += newDeviationTime;
        repairType = inferRepairType(deviations, missingParts, customerAdaptationType);
        repairTimeEstimate = deviationTimeEstimate + missingPartsTimeEstimate;
      } else if (forcedWorkType === 'missingPart') {
        const newMissingPartTime = getRandomRepairTime(0.25, 0.5);
        missingParts.push({
          id: `PART-FORCE-${i}`,
          name: getRandomElement(['Generic Part A', 'Generic Part B']),
          status: 'Available',
          promisedDeliveryDate: now,
          completed: false,
          completedBy: null,
          completedAt: null,
          timeEstimate: newMissingPartTime,
        });
        missingPartsTimeEstimate += newMissingPartTime;
        repairType = inferRepairType(deviations, missingParts, customerAdaptationType);
        repairTimeEstimate = deviationTimeEstimate + missingPartsTimeEstimate;
      } else if (forcedWorkType === 'customerAdaptation') {
        customerAdaptationType = getRandomElement(['Mechanical', 'Paint']);
        if (customerAdaptationType === 'Mechanical') {
          customerAdaptationWork = getRandomElement([
            'Basic mechanical customization',
            'Minor engine tune-up',
          ]);
          customerAdaptationTimeEstimate = getRandomRepairTime(0.5, 2.5);
        } else { // Paint
          customerAdaptationWork = getRandomElement([
            'Minor paint touch-up',
            'Exterior detailing',
          ]);
          paintDetails = {
            color: getRandomElement(PAINT_COLORS),
            paintBoothType: getRandomElement(PAINT_BOOTH_TYPES),
          };
          customerAdaptationTimeEstimate = getRandomRepairTime(2, 12);
        }
        customerAdaptationCompleted = false;
        repairType = customerAdaptationType === 'Mechanical' ? 'Customer Adaptation - Mechanical' : 'Customer Adaptation - Paint';
        repairTimeEstimate = customerAdaptationTimeEstimate;
      }
    }

    const customerPriority = getRandomElement(CUSTOMER_PRIORITIES);

    let deliveryDate: Date;
    const repairDays = Math.ceil(repairTimeEstimate / 8); // Convert hours to full days needed

    let minDeliveryDaysFromNow = repairDays + getRandomNumber(3, 7); // Add a buffer of 3-7 days
    if (customerPriority === 'Critical') {
      minDeliveryDaysFromNow = repairDays + getRandomNumber(1, 3); // Tighter buffer for critical
    }

    // Intentionally make some trucks overdue
    const shouldBeOverdue = overdueTrucksGenerated < targetOverdueCount && Math.random() < 0.5; // 50% chance to make it overdue if target not met
    if (shouldBeOverdue) {
      // Set delivery date to be slightly in the past or very tight
      deliveryDate = addDays(now, getRandomNumber(-5, 0)); // 0 to 5 days in the past
      overdueTrucksGenerated++;
    } else {
      // Ensure the delivery date is at least minDeliveryDaysFromNow from today
      deliveryDate = addDays(now, minDeliveryDaysFromNow);
    }

    // If the truck has pending missing parts, push the delivery date further out
    const hasPendingMissingParts = missingParts.some(mp => mp.status !== 'Available' && !mp.completed);
    if (hasPendingMissingParts) {
      const maxMissingPartDelivery = missingParts.reduce((maxDate, mp) => {
        if (mp.status !== 'Available' && !mp.completed && mp.promisedDeliveryDate) {
          return isAfter(mp.promisedDeliveryDate, maxDate || new Date(0)) ? mp.promisedDeliveryDate : maxDate;
        }
        return maxDate;
      }, null as Date | null);

      if (maxMissingPartDelivery) {
        // Ensure delivery date is after missing parts arrive + some buffer
        const daysAfterParts = differenceInDays(maxMissingPartDelivery, now) + getRandomNumber(2, 5);
        deliveryDate = isAfter(addDays(now, daysAfterParts), deliveryDate) ? addDays(now, daysAfterParts) : deliveryDate;
      }
    }

    // Ensure delivery date is not in the past relative to generation, unless it's a very short repair
    if (isBefore(deliveryDate, now) && !shouldBeOverdue) { // Only adjust if not intentionally overdue
      deliveryDate = addDays(now, 1); // At least tomorrow
    }

    let status: TruckStatus;
    const isOverdue = isPast(deliveryDate, now);

    if (hasPendingMissingParts) {
      status = isOverdue ? 'Overdue - Not Ready' : 'Not Ready';
    } else if (isOverdue) {
      status = 'Overdue - Ready to Plan';
    } else {
      status = 'Ready to Plan';
    }

    trucks.push({
      id: `TRUCK-${i + 1}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      chassisNumber: `BB-${chassisCounter++}`,
      deviations: deviations,
      missingParts: missingParts,
      customerAdaptationWork: customerAdaptationWork,
      customerAdaptationTimeEstimate: customerAdaptationTimeEstimate,
      customerAdaptationCompleted: customerAdaptationCompleted,
      customerAdaptationCompletedBy: null,
      customerAdaptationCompletedAt: null,
      customerAdaptationType: customerAdaptationType,
      paintDetails: paintDetails,
      okToDrive: Math.random() > 0.3,
      repairTimeEstimate: repairTimeEstimate, // This is now the primary estimate for its main repair type
      deviationTimeEstimate: deviationTimeEstimate, // Raw deviation time
      missingPartsTimeEstimate: missingPartsTimeEstimate, // Raw missing parts time
      repairType: repairType,
      repairAreaNeeded: getRandomElement(REPAIR_AREAS),
      deliveryDate: deliveryDate,
      customerPriority: customerPriority as Truck['customerPriority'],
      assignedOperatorIds: [],
      status: status,
      projectCode: projectCode,
    });
  }

  // Ensure a minimum number of critical trucks, which often become overdue
  const currentCriticalCount = trucks.filter(t => t.customerPriority === 'Critical').length;
  if (currentCriticalCount < targetOverdueCount) { // Use targetOverdueCount as a proxy for critical
    const trucksToPromote = trucks.filter(t => t.customerPriority !== 'Critical' && t.status !== 'Completed');
    for (let i = 0; i < targetOverdueCount - currentCriticalCount && i < trucksToPromote.length; i++) {
      const truckToPromote = trucksToPromote[i];
      truckToPromote.customerPriority = 'Critical';
      // For critical trucks, ensure their delivery date is tight but still plausible
      const repairDays = Math.ceil(truckToPromote.repairTimeEstimate / 8);
      truckToPromote.deliveryDate = addDays(now, repairDays + getRandomNumber(1, 3));
      
      const hasWork = truckToPromote.repairTimeEstimate > 0;
      if (!hasWork) {
        // If no work, add a general repair deviation
        const newDeviationTime = getRandomRepairTime(4, 8);
        truckToPromote.deviations.push({ id: `DEV-CRIT-${truckToPromote.id}`, description: 'Critical system malfunction', severity: 'High', completed: false, completedBy: null, completedAt: null, timeEstimate: newDeviationTime });
        truckToPromote.deviationTimeEstimate = (truckToPromote.deviationTimeEstimate || 0) + newDeviationTime;
        truckToPromote.repairTimeEstimate = (truckToPromote.deviationTimeEstimate || 0) + (truckToPromote.missingPartsTimeEstimate || 0);
        truckToPromote.repairType = inferRepairType(truckToPromote.deviations, truckToPromote.missingParts, truckToPromote.customerAdaptationType);
      }
      truckToPromote.status = 'Overdue - Ready to Plan';
    }
  }

  return trucks;
}

export function generateOperators(count: number): Operator[] {
  const operators: Operator[] = [];
  const now = new Date();

  const allOperatorNames = [
    "Alice Smith", "Bob Johnson", "Charlie Brown", "Diana Prince", "Eve Adams",
    "Frank White", "Grace Lee", "Harry Davis", "Ivy King", "Jack Taylor",
    "Karen Green", "Liam Hall", "Mia Clark", "Noah Wright", "Olivia Scott",
    "Peter Jones", "Quinn Miller", "Rachel Davis", "Sam Wilson", "Tina Moore",
    "Uma Sharma", "Victor Chen", "Wendy Kim", "Xavier Bell", "Yara Singh",
    "Zack Taylor", "Anna Lee", "Ben Carter", "Chloe King", "David Green"
  ];

  const shuffledNames = [...allOperatorNames].sort(() => 0.5 - Math.random());
  let nameIndex = 0;

  const numEarlyShift = count / 2;
  const numLateShift = count / 2;

  const numPaintPerShift = 2;
  const numGeneralRepairPerShift = 10; // 12 total per shift, 2 paint, 10 general

  for (let i = 0; i < count; i++) {
    const shiftType: Shift = i < numEarlyShift ? 'Early' : 'Late';
    let shiftStartTime: Date;
    let shiftEndTime: Date;

    if (shiftType === 'Early') {
      shiftStartTime = setMilliseconds(setSeconds(setMinutes(setHours(now, 6), 0), 0), 0);
      shiftEndTime = setMilliseconds(setSeconds(setMinutes(setHours(now, 14), 0), 0), 0);
    } else {
      shiftStartTime = setMilliseconds(setSeconds(setMinutes(setHours(now, 14), 0), 0), 0);
      shiftEndTime = setMilliseconds(setSeconds(setMinutes(setHours(now, 22), 0), 0), 0);
    }

    const competencies: RepairType[] = [];
    const currentShiftIndex = i % (count / 2); // Index within the current shift (0-11)

    if (currentShiftIndex < numPaintPerShift) {
      // Assign as Paint specialist
      competencies.push('Paint', 'Customer Adaptation - Paint');
    } else {
      // Assign as General Repair specialist
      const generalRepairTypes = REPAIR_TYPES.filter(type => !type.includes('Paint') && !type.startsWith('Customer Adaptation'));
      const numCompetencies = getRandomNumber(1, generalRepairTypes.length);
      const shuffledRepairTypes = [...generalRepairTypes].sort(() => 0.5 - Math.random());
      for (let j = 0; j < numCompetencies; j++) {
        competencies.push(shuffledRepairTypes[j]);
      }
      // Also add Customer Adaptation - Mechanical for general repair operators
      if (!competencies.includes('Customer Adaptation - Mechanical')) {
        competencies.push('Customer Adaptation - Mechanical');
      }
    }

    const operator: Operator = {
      id: `OP-${i + 1}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: shuffledNames[nameIndex++ % shuffledNames.length] || `Operator ${i + 1}`,
      competencies: Array.from(new Set(competencies)), // Ensure unique competencies
      status: 'Available',
      shiftStartTime: shiftStartTime,
      shiftEndTime: shiftEndTime,
      shift: shiftType,
      assignedTrucks: [],
      efficiency: parseFloat((Math.random() * (1.0 - 0.7) + 0.7).toFixed(2)),
    };
    operators.push(operator);
  }
  return operators;
}

interface PriorityBreakdown {
  customerPriority: number;
  deliveryDate: number;
  missingPartsAvailability: number;
  deviations: number;
  customerAdaptationWork: number;
  okToDrive: number;
  repairTimeEstimatePenalty: number;
  totalScore: number;
}

export function getPriorityScore(truck: Truck): PriorityBreakdown {
  let score = 0;
  const now = new Date();
  const breakdown: Omit<PriorityBreakdown, 'totalScore'> = {
    customerPriority: 0,
    deliveryDate: 0,
    missingPartsAvailability: 0,
    deviations: 0,
    customerAdaptationWork: 0,
    okToDrive: 0,
    repairTimeEstimatePenalty: 0,
  };

  const pendingMissingParts = truck.missingParts.filter(
    (mp) => mp.status !== 'Available' && !mp.completed
  );

  if (pendingMissingParts.length > 0) {
    return {
      ...breakdown,
      totalScore: 0,
      missingPartsAvailability: -100,
    };
  }

  const daysUntilDelivery = differenceInDays(truck.deliveryDate, now);
  if (isPast(truck.deliveryDate, now)) {
    breakdown.deliveryDate = 100 + Math.min(50, Math.abs(daysUntilDelivery) * 5);
  } else if (daysUntilDelivery <= 0) {
    breakdown.deliveryDate = 100;
  } else if (daysUntilDelivery === 1) {
    breakdown.deliveryDate = 90;
  } else if (daysUntilDelivery <= 3) {
    breakdown.deliveryDate = 70;
  } else if (daysUntilDelivery <= 7) {
    breakdown.deliveryDate = 50;
  } else {
    breakdown.deliveryDate = Math.max(0, 30 - (daysUntilDelivery - 7) * 1);
  }
  score += breakdown.deliveryDate;

  switch (truck.customerPriority) {
    case 'Critical':
      breakdown.customerPriority = 50;
      break;
    case 'High':
      breakdown.customerPriority = 35;
      break;
    case 'Medium':
      breakdown.customerPriority = 20;
      break;
    case 'Low':
      breakdown.customerPriority = 10;
      break;
  }
  score += breakdown.customerPriority;

  if (truck.missingParts.length > 0 && pendingMissingParts.length === 0) {
    breakdown.missingPartsAvailability = 20;
  }
  score += breakdown.missingPartsAvailability;

  truck.deviations.filter(dev => !dev.completed).forEach((dev) => {
    switch (dev.severity) {
      case 'High':
        breakdown.deviations += 10;
        break;
      case 'Medium':
        breakdown.deviations += 5;
        break;
      case 'Low':
        breakdown.deviations += 2;
        break;
    }
  });
  score += breakdown.deviations;

  if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
    breakdown.customerAdaptationWork = 5;
  }
  score += breakdown.customerAdaptationWork;

  if (!truck.okToDrive) {
    breakdown.okToDrive = 5;
  }
  score += breakdown.okToDrive;

  const totalEstimatedWorkTime = truck.repairTimeEstimate;
  breakdown.repairTimeEstimatePenalty = -Math.min(10, (totalEstimatedWorkTime / 24) * 10);
  score += breakdown.repairTimeEstimatePenalty;

  const totalScore = Math.max(0, Math.min(200, Math.round(score)));

  return {
    ...breakdown,
    totalScore: totalScore,
  };
}

export function getAvailableShiftHours(operator: Operator, planningDate: Date = new Date()): number {
  const shiftStartOnPlanningDate = setMilliseconds(setSeconds(setMinutes(setHours(planningDate, operator.shiftStartTime.getHours()), operator.shiftStartTime.getMinutes()), 0), 0);
  const shiftEndOnPlanningDate = setMilliseconds(setSeconds(setMinutes(setHours(planningDate, operator.shiftEndTime.getHours()), operator.shiftEndTime.getMinutes()), 0), 0);

  const now = new Date();

  let totalShiftDurationHours: number;

  if (format(planningDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
    if (isAfter(now, shiftEndOnPlanningDate)) {
      totalShiftDurationHours = 0;
    } else if (isBefore(now, shiftStartOnPlanningDate)) {
      totalShiftDurationHours = (shiftEndOnPlanningDate.getTime() - shiftStartOnPlanningDate.getTime()) / (1000 * 60 * 60);
    } else {
      totalShiftDurationHours = (shiftEndOnPlanningDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    }
  } else {
    totalShiftDurationHours = (shiftEndOnPlanningDate.getTime() - shiftStartOnPlanningDate.getTime()) / (1000 * 60 * 60);
  }

  if (operator.status === 'Off Duty' || operator.status === 'On Break') {
    return 0;
  }

  const assignedWorkload = operator.assignedTrucks.reduce((sum, truck) =>
    sum + truck.repairTimeEstimate
  , 0);

  return Math.max(0, totalShiftDurationHours - assignedWorkload);
}

export function getStatusColor(status: Truck['status'] | Operator['status']): string {
  switch (status) {
    case 'Pending':
      return 'bg-blue-100 text-blue-800';
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'Partial':
      return 'bg-orange-100 text-orange-800';
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Available':
      return 'bg-green-100 text-green-800';
    case 'Busy':
      return 'bg-red-100 text-red-800';
    case 'On Break':
      return 'bg-gray-100 text-gray-800';
    case 'Off Duty':
      return 'bg-purple-100 text-purple-800';
    case 'Overdue':
      return 'bg-red-200 text-red-900';
    case 'Missing Parts Not Available':
      return 'bg-gray-200 text-gray-800';
    case 'Assigned':
      return 'bg-indigo-100 text-indigo-800';
    case 'Overdue - Not Ready':
      return 'bg-red-300 text-red-900';
    case 'Ready to Plan':
      return 'bg-blue-400 text-white';
    case 'Ready to Finish':
      return 'bg-yellow-200 text-yellow-900';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getPriorityColor(score: number): string {
  if (score >= 150) {
    return 'bg-red-500 text-white';
  } else if (score >= 100) {
    return 'bg-orange-500 text-white';
  } else if (score >= 50) {
    return 'bg-yellow-500 text-black';
  } else {
    return 'bg-green-500 text-white';
  }
}

export function getSeverityColor(severity: Deviation['severity']): string {
  switch (severity) {
    case 'High':
      return 'text-red-600';
    case 'Medium':
      return 'text-orange-600';
    case 'Low':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
}

export function getMissingPartStatusColor(status: MissingPartStatus): string {
  switch (status) {
    case 'Available':
      return 'bg-green-500 text-white';
    case 'In Transit':
      return 'bg-yellow-500 text-black';
    case 'Ordered':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getEfficiencyColor(efficiency: number): string {
  if (efficiency >= 0.9) return 'text-green-600';
  if (efficiency >= 0.75) return 'text-yellow-600';
  return 'text-red-600';
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function formatDate(date: Date): string {
  return format(date, 'MMM dd, yyyy');
}

export function generateNextDays(numDays: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  for (let i = 0; i < numDays; i++) {
    dates.push(addDays(today, i));
  }
  return dates;
}

export function simulatePaintBoothSchedule(
  trucks: Truck[],
  numDays: number,
  capacities: { small: number; large: number }
): {
  occupancyData: DailyPaintBoothOccupancy[];
  truckCompletionDates: Map<string, Date>;
} {
  const { small: smallCapacity, large: largeCapacity } = capacities;
  const totalCapacity = smallCapacity + largeCapacity;

  const dailyOccupancyMap = new Map<string, DailyPaintBoothOccupancy>();
  const truckCompletionDates = new Map<string, Date>();
  const today = startOfDay(new Date());

  // Initialize daily occupancy for a wider range to allow for multi-day scheduling
  const extendedNumDays = numDays + 60; // Schedule up to 60 days out
  for (let i = 0; i < extendedNumDays; i++) {
    const date = addDays(today, i);
    const formattedDate = format(date, 'MMM dd');
    dailyOccupancyMap.set(formattedDate, {
      date: formattedDate,
      totalScheduledHours: 0,
      smallBoothPaintHours: 0,
      smallBoothCAPaintHours: 0,
      largeBoothPaintHours: 0,
      largeBoothCAPaintHours: 0,
      smallBoothScheduledHours: 0,
      largeBoothScheduledHours: 0,
      availableCapacity: totalCapacity,
      capacityProblem: false,
      smallBoothScheduledTrucksDetails: [],
      largeBoothScheduledTrucksDetails: [],
    });
  }

  const sortedTrucks = [...trucks].sort((a, b) => {
    // Prioritize by delivery date (earliest first), then Critical priority
    const deliveryDateDiff = a.deliveryDate.getTime() - b.deliveryDate.getTime();
    if (deliveryDateDiff !== 0) return deliveryDateDiff;

    const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    return (priorityOrder[b.customerPriority] || 0) - (priorityOrder[a.customerPriority] || 0);
  });

  sortedTrucks.forEach((truck) => {
    let hoursRemainingForTruck = truck.repairTimeEstimate || 0;
    const isCAPaint = truck.customerAdaptationType === 'Paint';
    const requiredBoothType = truck.paintDetails?.paintBoothType || 'Small';
    let truckCompletedOnDate: Date | null = null;

    for (let dayIndex = 0; dayIndex < extendedNumDays; dayIndex++) {
      if (hoursRemainingForTruck <= 0) {
        truckCompletedOnDate = addDays(today, dayIndex - 1); // Truck completed on previous day
        break;
      }

      const dateForScheduling = addDays(today, dayIndex);
      const formattedDate = format(dateForScheduling, 'MMM dd');
      const currentDayEntry = dailyOccupancyMap.get(formattedDate)!;

      let hoursScheduledToday = 0;

      if (requiredBoothType === 'Large') {
        const largeBoothRemainingCapacity = largeCapacity - currentDayEntry.largeBoothScheduledHours;
        const hoursToAllocateInLargeBooth = Math.min(hoursRemainingForTruck, largeBoothRemainingCapacity);
        
        if (hoursToAllocateInLargeBooth > 0) {
          currentDayEntry.largeBoothScheduledHours += hoursToAllocateInLargeBooth;
          hoursScheduledToday += hoursToAllocateInLargeBooth;
          hoursRemainingForTruck -= hoursToAllocateInLargeBooth;

          if (isCAPaint) {
            currentDayEntry.largeBoothCAPaintHours += hoursToAllocateInLargeBooth;
          } else {
            currentDayEntry.largeBoothPaintHours += hoursToAllocateInLargeBooth;
          }
          currentDayEntry.largeBoothScheduledTrucksDetails.push({
            truckId: truck.id,
            chassisNumber: truck.chassisNumber,
            repairType: truck.repairType,
            hoursScheduled: hoursToAllocateInLargeBooth,
            paintBoothType: requiredBoothType,
          });
        }
      } else { // Small booth required, but can overflow to large if needed
        const smallBoothRemainingCapacity = smallCapacity - currentDayEntry.smallBoothScheduledHours;
        const largeBoothRemainingCapacity = largeCapacity - currentDayEntry.largeBoothScheduledHours;

        const hoursToAllocateInSmallBooth = Math.min(hoursRemainingForTruck, smallBoothRemainingCapacity);
        if (hoursToAllocateInSmallBooth > 0) {
          currentDayEntry.smallBoothScheduledHours += hoursToAllocateInSmallBooth;
          hoursScheduledToday += hoursToAllocateInSmallBooth;
          hoursRemainingForTruck -= hoursToAllocateInSmallBooth;

          if (isCAPaint) {
            currentDayEntry.smallBoothCAPaintHours += hoursToAllocateInSmallBooth;
          } else {
            currentDayEntry.smallBoothPaintHours += hoursToAllocateInSmallBooth;
          }
          currentDayEntry.smallBoothScheduledTrucksDetails.push({
            truckId: truck.id,
            chassisNumber: truck.chassisNumber,
            repairType: truck.repairType,
            hoursScheduled: hoursToAllocateInSmallBooth,
            paintBoothType: requiredBoothType,
          });
        }

        if (hoursRemainingForTruck > 0) { // If still hours remaining, try large booth
          const hoursToAllocateInLargeBooth = Math.min(hoursRemainingForTruck, largeBoothRemainingCapacity);
          if (hoursToAllocateInLargeBooth > 0) {
            currentDayEntry.largeBoothScheduledHours += hoursToAllocateInLargeBooth;
            hoursScheduledToday += hoursToAllocateInLargeBooth;
            hoursRemainingForTruck -= hoursToAllocateInLargeBooth;

            if (isCAPaint) {
              currentDayEntry.largeBoothCAPaintHours += hoursToAllocateInLargeBooth;
            } else {
              currentDayEntry.largeBoothPaintHours += hoursToAllocateInLargeBooth;
            }
            currentDayEntry.largeBoothScheduledTrucksDetails.push({
              truckId: truck.id,
              chassisNumber: truck.chassisNumber,
              repairType: truck.repairType,
              hoursScheduled: hoursToAllocateInLargeBooth,
              paintBoothType: 'Large', // Allocated to large booth
            });
          }
        }
      }

      currentDayEntry.totalScheduledHours = currentDayEntry.smallBoothScheduledHours + currentDayEntry.largeBoothScheduledHours;
      currentDayEntry.availableCapacity = totalCapacity - currentDayEntry.totalScheduledHours; // Recalculate available capacity
      currentDayEntry.capacityProblem = currentDayEntry.totalScheduledHours > totalCapacity; // Check for daily overflow
      dailyOccupancyMap.set(formattedDate, currentDayEntry);

      if (hoursRemainingForTruck <= 0) {
        truckCompletedOnDate = dateForScheduling;
        break;
      }
    }

    if (truckCompletedOnDate) {
      truckCompletionDates.set(truck.id, truckCompletedOnDate);
    } else {
      // If truck couldn't be scheduled within extendedNumDays, set completion to the last day
      truckCompletionDates.set(truck.id, addDays(today, extendedNumDays - 1));
    }
  });

  const occupancyData = Array.from(dailyOccupancyMap.values()).sort((a, b) => {
    const dateA = new Date(a.date + ' ' + today.getFullYear());
    const dateB = new Date(b.date + ' ' + today.getFullYear());
    return dateA.getTime() - dateB.getTime();
  }).filter((entry, index) => {
    const entryDate = new Date(entry.date + ' ' + today.getFullYear());
    return isAfter(entryDate, addDays(today, -1)) && isBefore(entryDate, addDays(today, numDays));
  });

  return { occupancyData, truckCompletionDates };
}

export function simulateGeneralRepairSchedule(
  trucks: Truck[],
  operators: Operator[],
  numDays: number,
  earliestStartDates: Map<string, Date> = new Map() // New parameter for sequential scheduling
): {
  occupancyData: DailyOperatorOccupancy[];
  truckCompletionDates: Map<string, Date>;
} {
  const dailyOccupancyMap = new Map<string, DailyOperatorOccupancy>();
  const truckCompletionDates = new Map<string, Date>();
  const today = startOfDay(new Date());

  // Initialize daily occupancy for a wider range to allow for multi-day scheduling
  const extendedNumDays = numDays + 60; // Schedule up to 60 days out
  for (let i = 0; i < extendedNumDays; i++) {
    const date = addDays(today, i);
    const formattedDate = format(date, 'MMM dd');
    dailyOccupancyMap.set(formattedDate, {
      date: formattedDate,
      totalScheduledHours: 0,
      availableCapacity: 0, // Will be calculated based on available operators
      capacityProblem: false,
      scheduledTrucksDetails: [],
      operatorWorkload: {},
    });
  }

  // Sort trucks by delivery date (earliest first), then customer priority (Critical first)
  const sortedTrucks = [...trucks].sort((a, b) => {
    // If earliestStartDates are provided, prioritize trucks that can start earlier
    const aEarliestStart = earliestStartDates.get(a.id) || today;
    const bEarliestStart = earliestStartDates.get(b.id) || today;
    const earliestStartDiff = aEarliestStart.getTime() - bEarliestStart.getTime();
    if (earliestStartDiff !== 0) return earliestStartDiff;

    const deliveryDateDiff = a.deliveryDate.getTime() - b.deliveryDate.getTime();
    if (deliveryDateDiff !== 0) return deliveryDateDiff;

    const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    return (priorityOrder[b.customerPriority] || 0) - (priorityOrder[a.customerPriority] || 0);
  });

  // Create a mutable copy of operators for scheduling, tracking their daily workload
  const mutableOperatorsDailyWorkload = new Map<string, { [dateKey: string]: number }>(); // operatorId -> { 'MMM dd': hoursScheduled }
  operators.forEach(op => mutableOperatorsDailyWorkload.set(op.id, {}));

  sortedTrucks.forEach((truck) => {
    // BUG FIX: Use the sum of deviation and missing parts time for general repair
    let hoursRemainingForTruck = (truck.deviationTimeEstimate || 0) + (truck.missingPartsTimeEstimate || 0);
    let truckCompletedOnDate: Date | null = null;

    // Determine the actual start day for this truck based on earliestStartDates
    let startDayIndex = 0;
    if (earliestStartDates.has(truck.id)) {
      const earliestStartDate = earliestStartDates.get(truck.id)!;
      startDayIndex = Math.max(0, differenceInDays(earliestStartDate, today));
    }

    // Determine the specific general repair competencies needed for this truck
    const neededCompetencies = getGeneralRepairTypesNeeded(truck);

    // If no general repair work is needed, or no competencies are identified, skip scheduling
    if (hoursRemainingForTruck <= 0 || neededCompetencies.length === 0) {
      truckCompletionDates.set(truck.id, earliestStartDates.get(truck.id) || today); // Mark as completed on earliest start or today if no work
      return;
    }

    for (let dayIndex = startDayIndex; dayIndex < extendedNumDays; dayIndex++) {
      if (hoursRemainingForTruck <= 0) {
        truckCompletedOnDate = addDays(today, dayIndex - 1); // Truck completed on previous day
        break;
      }

      const dateForScheduling = addDays(today, dayIndex);
      const formattedDate = format(dateForScheduling, 'MMM dd');
      const currentDayEntry = dailyOccupancyMap.get(formattedDate)!;

      // Calculate total available operator capacity for this day
      let totalDailyOperatorCapacity = 0;
      operators.forEach(op => { // Use original operators to get shift times
        const shiftStartOnDay = setMilliseconds(setSeconds(setMinutes(setHours(dateForScheduling, op.shiftStartTime.getHours()), op.shiftStartTime.getMinutes()), 0), 0);
        const shiftEndOnDay = setMilliseconds(setSeconds(setMinutes(setHours(dateForScheduling, op.shiftEndTime.getHours()), op.shiftEndTime.getMinutes()), 0), 0);
        
        let dailyAvailableHours = 0;
        if (op.status === 'Available') {
          dailyAvailableHours = (shiftEndOnDay.getTime() - shiftStartOnDay.getTime()) / (1000 * 60 * 60);
          // Subtract already scheduled hours for this operator on this specific day
          const scheduledForOperatorToday = mutableOperatorsDailyWorkload.get(op.id)?.[formattedDate] || 0;
          dailyAvailableHours = Math.max(0, dailyAvailableHours - scheduledForOperatorToday);
        }
        totalDailyOperatorCapacity += dailyAvailableHours;
      });
      currentDayEntry.availableCapacity = totalDailyOperatorCapacity;

      // Find the single best suitable operator for the current truck on this day
      const bestOperatorForThisTruckToday = operators.filter(op =>
        op.status === 'Available' &&
        neededCompetencies.some(comp => op.competencies.includes(comp)) // Check if operator has *any* needed competency
      ).sort((a, b) => {
        // Prioritize by remaining hours (more available first), then efficiency
        const aRemainingHours = (a.shiftEndTime.getTime() - a.shiftStartTime.getTime()) / (1000 * 60 * 60) - (mutableOperatorsDailyWorkload.get(a.id)?.[formattedDate] || 0);
        const bRemainingHours = (b.shiftEndTime.getTime() - b.shiftStartTime.getTime()) / (1000 * 60 * 60) - (mutableOperatorsDailyWorkload.get(b.id)?.[formattedDate] || 0);
        
        if (aRemainingHours !== bRemainingHours) {
          return bRemainingHours - aRemainingHours; // More hours available first
        }
        return b.efficiency - a.efficiency; // Then more efficient
      })[0]; // Take only the best one

      let hoursScheduledToday = 0;

      if (bestOperatorForThisTruckToday) {
        const operatorDailyWorkload = mutableOperatorsDailyWorkload.get(bestOperatorForThisTruckToday.id)!;
        const operatorScheduledToday = operatorDailyWorkload[formattedDate] || 0;
        const operatorTotalShiftHours = (bestOperatorForThisTruckToday.shiftEndTime.getTime() - bestOperatorForThisTruckToday.shiftStartTime.getTime()) / (1000 * 60 * 60);
        const operatorRemainingHoursToday = Math.max(0, operatorTotalShiftHours - operatorScheduledToday);

        const hoursToAllocate = Math.min(hoursRemainingForTruck, operatorRemainingHoursToday * bestOperatorForThisTruckToday.efficiency);

        if (hoursToAllocate > 0) {
          // Update operator's assigned workload for the day
          operatorDailyWorkload[formattedDate] = (operatorDailyWorkload[formattedDate] || 0) + hoursToAllocate;
          mutableOperatorsDailyWorkload.set(bestOperatorForThisTruckToday.id, operatorDailyWorkload);

          if (!currentDayEntry.operatorWorkload[bestOperatorForThisTruckToday.id]) {
            currentDayEntry.operatorWorkload[bestOperatorForThisTruckToday.id] = {
              operatorName: bestOperatorForThisTruckToday.name,
              hoursScheduled: 0,
              trucks: [],
            };
          }
          currentDayEntry.operatorWorkload[bestOperatorForThisTruckToday.id].hoursScheduled += hoursToAllocate;
          currentDayEntry.operatorWorkload[bestOperatorForThisTruckToday.id].trucks.push({
            truckId: truck.id,
            chassisNumber: truck.chassisNumber,
            hours: hoursToAllocate,
          });

          hoursScheduledToday += hoursToAllocate;
          hoursRemainingForTruck -= hoursToAllocate;
          currentDayEntry.scheduledTrucksDetails.push({
            truckId: truck.id,
            chassisNumber: truck.chassisNumber,
            repairType: truck.repairType, // Keep original repairType for display, but assignment based on neededCompetencies
            hoursScheduled: hoursToAllocate,
            operatorId: bestOperatorForThisTruckToday.id,
            operatorName: bestOperatorForThisTruckToday.name,
          });
        }
      }

      currentDayEntry.totalScheduledHours += hoursScheduledToday;
      currentDayEntry.capacityProblem = currentDayEntry.totalScheduledHours > currentDayEntry.availableCapacity;
      dailyOccupancyMap.set(formattedDate, currentDayEntry);

      if (hoursRemainingForTruck <= 0) {
        truckCompletedOnDate = dateForScheduling;
        break;
      }
    }

    if (truckCompletedOnDate) {
      truckCompletionDates.set(truck.id, truckCompletedOnDate);
    } else {
      // If truck couldn't be scheduled within extendedNumDays, set completion to the last day
      truckCompletionDates.set(truck.id, addDays(today, extendedNumDays - 1));
    }
  });

  const occupancyData = Array.from(dailyOccupancyMap.values()).sort((a, b) => {
    const dateA = new Date(a.date + ' ' + today.getFullYear());
    const dateB = new Date(b.date + ' ' + today.getFullYear());
    return dateA.getTime() - dateB.getTime();
  }).filter((entry, index) => {
    const entryDate = new Date(entry.date + ' ' + today.getFullYear());
    return isAfter(entryDate, addDays(today, -1)) && isBefore(entryDate, addDays(today, numDays));
  });

  return { occupancyData, truckCompletionDates };
}
