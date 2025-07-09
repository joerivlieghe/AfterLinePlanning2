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
} from '@/types';
import { addDays, isBefore, isAfter, format, differenceInDays, isPast, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

export const REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation'];
const REPAIR_AREAS: RepairArea[] = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5', 'Bay 6'];
const MISSING_PART_STATUSES: MissingPartStatus[] = ['Ordered', 'In Transit', 'Available'];
const OPERATOR_STATUSES: OperatorStatus[] = ['Available', 'Busy', 'On Break', 'Off Duty'];
export const CUSTOMER_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const SHIFTS: Shift[] = ['Early', 'Late'];

// Define a fixed set of project codes
const PROJECT_CODES: string[] = ['PROJ-ALPHA', 'PROJ-BETA', 'PROJ-GAMMA'];
const MAX_PROJECT_TRUCK_PERCENTAGE = 0.03; // 3%

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

function inferRepairType(deviations: Deviation[], missingParts: MissingPart[], customerAdaptationWork: string | null): RepairType {
  const potentialTypes: RepairType[] = [];

  if (customerAdaptationWork) {
    potentialTypes.push('Customer Adaptation');
  }

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
  return getRandomElement(REPAIR_TYPES.filter(type => type !== 'Customer Adaptation'));
}

export function calculateRemainingRepairTime(truck: Truck): number {
  let remainingTime = 0;

  truck.deviations.forEach(dev => {
    if (!dev.completed && dev.timeEstimate) {
      remainingTime += dev.timeEstimate;
    }
  });

  truck.missingParts.forEach(mp => {
    if (!mp.completed && mp.timeEstimate) {
      remainingTime += mp.timeEstimate;
    }
  });

  if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted && truck.customerAdaptationTimeEstimate) {
    remainingTime += truck.customerAdaptationTimeEstimate;
  }

  return remainingTime;
}

export function generateTrucks(count: number): Truck[] {
  const trucks: Truck[] = [];
  const now = new Date();
  let chassisCounter = 512345;
  let projectTrucksCount = 0;
  const maxProjectTrucks = Math.floor(count * MAX_PROJECT_TRUCK_PERCENTAGE);

  for (let i = 0; i < count; i++) {
    let deviations: Deviation[] = [];
    let missingParts: MissingPart[] = [];
    let customerAdaptationWork: string | null = null;
    let customerAdaptationCompleted: boolean = false;
    let projectCode: string | undefined = undefined;

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

    if (includeMissingPart) {
      missingParts = generateMissingParts(true);
    } else {
      missingParts = generateMissingParts(false);
    }

    if (includeCustomerAdaptation) {
      customerAdaptationWork = getRandomElement([
        'Custom paint job',
        'Enhanced interior lighting',
        'Specialized cargo securing system',
        'Additional safety features',
        'Integrated navigation system upgrade',
      ]);
      customerAdaptationCompleted = false;
    }

    // Ensure at least some work if none was generated
    if (deviations.length === 0 && missingParts.length === 0 && customerAdaptationWork === null) {
      const forcedWorkType = getRandomElement(['deviation', 'missingPart', 'customerAdaptation']);
      if (forcedWorkType === 'deviation') {
        deviations.push({
          id: `DEV-FORCE-${i}`,
          description: 'Minor check-up required',
          severity: 'Low',
          completed: false,
          completedBy: null,
          completedAt: null,
          timeEstimate: getRandomRepairTime(0.5, 1),
        });
      } else if (forcedWorkType === 'missingPart') {
        missingParts.push({
          id: `PART-FORCE-${i}`,
          name: getRandomElement(['Generic Part A', 'Generic Part B']),
          status: 'Available',
          promisedDeliveryDate: now,
          completed: false,
          completedBy: null,
          completedAt: null,
          timeEstimate: getRandomRepairTime(0.25, 0.5),
        });
      } else if (forcedWorkType === 'customerAdaptation') {
        customerAdaptationWork = getRandomElement([
          'Basic interior customization',
          'Minor exterior detailing',
        ]);
        customerAdaptationCompleted = false;
      }
    }

    let deviationTimeEstimate: number = deviations.reduce((sum, dev) => sum + (dev.timeEstimate || 0), 0);
    let missingPartsTimeEstimate: number = missingParts.reduce((sum, part) => sum + (part.timeEstimate || 0), 0);
    let customerAdaptationTimeEstimate: number = customerAdaptationWork ? getRandomRepairTime(0.5, 2.5) : 0;

    const initialRepairTimeEstimate = deviationTimeEstimate + missingPartsTimeEstimate + customerAdaptationTimeEstimate;
    const repairType = inferRepairType(deviations, missingParts, customerAdaptationWork);

    let deliveryDate: Date;
    const randDelivery = Math.random();
    if (randDelivery < 0.15) { // 15% overdue
      deliveryDate = getRandomDate(addDays(now, -30), addDays(now, -1));
    } else if (randDelivery < 0.45) { // 30% due soon
      deliveryDate = getRandomDate(addDays(now, 1), addDays(now, 7));
    } else { // 55% due later
      deliveryDate = getRandomDate(addDays(now, 8), addDays(now, 60));
    }

    const customerPriority = getRandomElement(CUSTOMER_PRIORITIES);

    let status: TruckStatus;
    const hasPendingMissingParts = missingParts.some(mp => mp.status !== 'Available' && !mp.completed);
    const isOverdue = isPast(deliveryDate); // Corrected: isPast takes one argument

    // Determine status based on conditions
    if (hasPendingMissingParts) {
      status = isOverdue ? 'Overdue - Not Ready' : 'Not Ready';
    } else if (isOverdue) {
      status = 'Overdue - Ready to Plan';
    } else {
      // If not overdue and no pending missing parts, it's ready to plan
      status = 'Ready to Plan';
    }

    const newTruck: Truck = {
      id: `TRUCK-${i + 1}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      chassisNumber: `BB-${chassisCounter++}`,
      deviations: deviations,
      missingParts: missingParts,
      customerAdaptationWork: customerAdaptationWork,
      customerAdaptationTimeEstimate: customerAdaptationTimeEstimate,
      customerAdaptationCompleted: customerAdaptationCompleted,
      okToDrive: Math.random() > 0.3,
      repairTimeEstimate: initialRepairTimeEstimate, // Initial total estimate
      deviationTimeEstimate: deviationTimeEstimate,
      missingPartsTimeEstimate: missingPartsTimeEstimate,
      repairType: repairType,
      repairAreaNeeded: getRandomElement(REPAIR_AREAS),
      deliveryDate: deliveryDate,
      customerPriority: customerPriority as Truck['customerPriority'],
      assignedOperatorIds: [],
      status: status,
      projectCode: projectCode,
    };
    // Set initial repairTimeEstimate to remaining time
    newTruck.repairTimeEstimate = calculateRemainingRepairTime(newTruck);
    trucks.push(newTruck);
  }

  // Ensure a minimum number of critical trucks for demonstration
  const criticalTrucksCount = Math.floor(count * 0.05);
  let currentCriticalCount = trucks.filter(t => t.customerPriority === 'Critical').length;
  while (currentCriticalCount < criticalTrucksCount) {
    const truckToPromote = getRandomElement(trucks.filter(t => t.customerPriority !== 'Critical' && t.status !== 'Completed'));
    if (truckToPromote) {
      truckToPromote.customerPriority = 'Critical';
      truckToPromote.deliveryDate = addDays(now, getRandomNumber(1, 3));
      // Ensure critical trucks have some work if they don't
      const hasWork = truckToPromote.deviations.length > 0 || truckToPromote.missingParts.length > 0 || truckToPromote.customerAdaptationWork !== null;
      if (!hasWork) {
        const newDeviationTime = getRandomRepairTime(4, 8);
        truckToPromote.deviations.push({ id: `DEV-CRIT-${truckToPromote.id}`, description: 'Critical system malfunction', severity: 'High', completed: false, completedBy: null, completedAt: null, timeEstimate: newDeviationTime });
        truckToPromote.deviationTimeEstimate = (truckToPromote.deviationTimeEstimate || 0) + newDeviationTime;
      }
      truckToPromote.repairTimeEstimate = calculateRemainingRepairTime(truckToPromote); // Recalculate remaining time
      truckToPromote.repairType = inferRepairType(truckToPromote.deviations, truckToPromote.missingParts, truckToPromote.customerAdaptationWork);
      truckToPromote.status = 'Overdue - Ready to Plan'; // Critical trucks should be ready to plan or overdue
      currentCriticalCount++;
    } else {
      // Break if no more eligible trucks to promote
      break;
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
  const uniqueNames = shuffledNames.slice(0, Math.min(count, shuffledNames.length));

  for (let i = 0; i < count; i++) {
    const shiftType = getRandomElement(SHIFTS);
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
    const numCompetencies = getRandomNumber(1, REPAIR_TYPES.length);
    const shuffledRepairTypes = [...REPAIR_TYPES].sort(() => 0.5 - Math.random());
    for (let j = 0; j < numCompetencies; j++) {
      competencies.push(shuffledRepairTypes[j]);
    }

    const operator: Operator = {
      id: `OP-${i + 1}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: uniqueNames[i] || `Operator ${i + 1}`,
      competencies: competencies,
      status: 'Available',
      shiftStartTime: shiftStartTime,
      shiftEndTime: shiftEndTime,
      shift: shiftType,
      assignedTruckIds: [], // Initialize with IDs
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

  // If there are pending missing parts, the truck cannot be worked on, so its priority is 0
  if (pendingMissingParts.length > 0) {
    return {
      ...breakdown,
      totalScore: 0,
      missingPartsAvailability: -100, // Indicate why score is 0
    };
  }

  const daysUntilDelivery = differenceInDays(truck.deliveryDate, now);
  if (isPast(truck.deliveryDate)) { // Corrected: isPast takes one argument
    breakdown.deliveryDate = 100 + Math.min(50, Math.abs(daysUntilDelivery) * 5); // Higher score for more overdue
  } else if (daysUntilDelivery <= 0) { // Due today
    breakdown.deliveryDate = 100;
  } else if (daysUntilDelivery === 1) {
    breakdown.deliveryDate = 90;
  } else if (daysUntilDelivery <= 3) {
    breakdown.deliveryDate = 70;
  } else if (daysUntilDelivery <= 7) {
    breakdown.deliveryDate = 50;
  } else {
    breakdown.deliveryDate = Math.max(0, 30 - (daysUntilDelivery - 7) * 1); // Decreasing score for further dates
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

  // Only add score for missing parts if they are all available
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

  const totalEstimatedWorkTime = calculateRemainingRepairTime(truck); // Use remaining time for penalty
  // Penalty for very long repair times, to prioritize quicker wins
  breakdown.repairTimeEstimatePenalty = -Math.min(10, (totalEstimatedWorkTime / 24) * 10);
  score += breakdown.repairTimeEstimatePenalty;

  const totalScore = Math.max(0, Math.min(200, Math.round(score))); // Cap score between 0 and 200

  return {
    ...breakdown,
    totalScore: totalScore,
  };
}

export function getAvailableShiftHours(operator: Operator, allTrucks: Truck[], planningDate: Date = new Date()): number {
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

  // Calculate assigned workload based on remaining repair time of assigned trucks
  const assignedWorkload = operator.assignedTruckIds.reduce((sum, truckId) => {
    const truck = allTrucks.find(t => t.id === truckId);
    return sum + (truck ? calculateRemainingRepairTime(truck) : 0);
  }, 0);

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
