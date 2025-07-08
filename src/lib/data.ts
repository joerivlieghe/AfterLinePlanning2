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
import { addDays, addHours, isBefore, isAfter, format, differenceInDays, isPast, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

const REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation']; // Added 'Customer Adaptation'
const REPAIR_AREAS: RepairArea[] = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5', 'Bay 6'];
const MISSING_PART_STATUSES: MissingPartStatus[] = ['Ordered', 'In Transit', 'Available'];
const OPERATOR_STATUSES: OperatorStatus[] = ['Available', 'Busy', 'On Break', 'Off Duty'];
const CUSTOMER_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const SHIFTS: Shift[] = ['Early', 'Late'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generates a random number with quarter-hour increments, ensuring minimum is 0.25
function getRandomRepairTime(min: number, max: number): number {
  const actualMin = Math.max(0.25, min); // Ensure minimum is 0.25
  const range = (max - actualMin) * 4; // Convert to quarter-hour units
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
    numDeviations = getRandomNumber(1, 2); // At least one, up to two
  } else {
    numDeviations = Math.random() < 0.6 ? getRandomNumber(0, 2) : 0; // 60% chance of 0-2 deviations
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
    });
  }
  return deviations;
}

function generateMissingParts(guaranteeOne: boolean = false): MissingPart[] {
  const missingParts: MissingPart[] = [];
  let numMissingParts = 0;

  if (guaranteeOne) {
    numMissingParts = getRandomNumber(1, 2); // At least one, up to two
  } else {
    numMissingParts = Math.random() < 0.5 ? getRandomNumber(0, 2) : 0; // 50% chance of 0-2 missing parts
  }

  for (let i = 0; i < numMissingParts; i++) {
    const status = getRandomElement(MISSING_PART_STATUSES);
    const promisedDeliveryDate = status === 'Available'
      ? new Date() // Already available
      : getRandomDate(addDays(new Date(), 1), addDays(new Date(), 14)); // Future date
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
      completed: false, // Initially not completed
      completedBy: null,
      completedAt: null,
      promisedDeliveryDate: promisedDeliveryDate,
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
  return getRandomElement(REPAIR_TYPES.filter(type => type !== 'Customer Adaptation')); // Fallback if no specific type inferred, exclude CA
}

export function generateTrucks(count: number): Truck[] {
  const trucks: Truck[] = [];
  const now = new Date();
  let chassisCounter = 512345; // Starting from BB-512345

  for (let i = 0; i < count; i++) {
    let deviations: Deviation[] = [];
    let missingParts: MissingPart[] = [];
    let customerAdaptationWork: string | null = null;
    let customerAdaptationTimeEstimate: number = 0;
    let deviationTimeEstimate: number = 0;
    let missingPartsTimeEstimate: number = 0;
    let repairTimeEstimate: number = 0;
    let repairType: RepairType = getRandomElement(REPAIR_TYPES.filter(type => type !== 'Customer Adaptation')); // Default type

    // Ensure every truck has at least one type of work
    const workTypesToGenerate: ('deviation' | 'missingPart' | 'customerAdaptation')[] = [];
    const initialWorkType = getRandomElement(['deviation', 'missingPart', 'customerAdaptation']);
    workTypesToGenerate.push(initialWorkType);

    // Optionally add more work types (up to 3 total)
    if (Math.random() < 0.5) workTypesToGenerate.push(getRandomElement(['deviation', 'missingPart', 'customerAdaptation']));
    if (Math.random() < 0.3) workTypesToGenerate.push(getRandomElement(['deviation', 'missingPart', 'customerAdaptation']));

    // Ensure unique work types
    const uniqueWorkTypes = [...new Set(workTypesToGenerate)];

    uniqueWorkTypes.forEach(type => {
      if (type === 'deviation') {
        deviations = deviations.concat(generateDeviations(true)); // Guarantee at least one deviation
        if (deviations.length > 0) {
          deviationTimeEstimate = getRandomRepairTime(0.5, 2); // Keep deviation time low
        }
      } else if (type === 'missingPart') {
        missingParts = missingParts.concat(generateMissingParts(true)); // Guarantee at least one missing part
        if (missingParts.length > 0) {
          missingPartsTimeEstimate = getRandomRepairTime(0.25, 1.5); // Keep missing part time low
        }
      } else if (type === 'customerAdaptation') {
        if (!customerAdaptationWork) { // Only add if not already added
          customerAdaptationWork = getRandomElement([
            'Custom paint job',
            'Enhanced interior lighting',
            'Specialized cargo securing system',
            'Additional safety features',
            'Integrated navigation system upgrade',
          ]);
          customerAdaptationTimeEstimate = getRandomRepairTime(0.5, 2.5); // Keep CA time low
        }
      }
    });

    // Calculate total repair time
    repairTimeEstimate = deviationTimeEstimate + missingPartsTimeEstimate + customerAdaptationTimeEstimate;
    repairType = inferRepairType(deviations, missingParts, customerAdaptationWork);

    // If after all this, repairTimeEstimate is still 0 (e.g., if all generated activities were completed, or if the random generation somehow resulted in no actual work),
    // force at least one small deviation to ensure a non-zero repair time.
    if (repairTimeEstimate === 0 && deviations.length === 0 && missingParts.length === 0 && customerAdaptationWork === null) {
        deviations.push({ id: `DEV-FORCE-${i}`, description: 'Minor check-up required', severity: 'Low', completed: false, completedBy: null, completedAt: null });
        deviationTimeEstimate = getRandomRepairTime(0.25, 0.5); // Very small time
        repairTimeEstimate = deviationTimeEstimate;
        repairType = inferRepairType(deviations, missingParts, customerAdaptationWork);
    }
    
    // Generate delivery dates: some overdue, some soon, some far
    let deliveryDate: Date;
    const rand = Math.random();
    if (rand < 0.15) { // 15% overdue
      deliveryDate = getRandomDate(addDays(now, -30), addDays(now, -1));
    } else if (rand < 0.45) { // 30% due in next 7 days
      deliveryDate = getRandomDate(addDays(now, 1), addDays(now, 7));
    } else { // 55% due later
      deliveryDate = getRandomDate(addDays(now, 8), addDays(now, 60));
    }

    const customerPriority = getRandomElement(CUSTOMER_PRIORITIES);

    let status: TruckStatus = 'Pending'; // Default status

    trucks.push({
      id: `TRUCK-${i + 1}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      chassisNumber: `BB-${chassisCounter++}`, // New chassis number format
      deviations: deviations,
      missingParts: missingParts,
      customerAdaptationWork: customerAdaptationWork,
      customerAdaptationTimeEstimate: customerAdaptationTimeEstimate,
      customerAdaptationCompleted: false, // Default to false
      okToDrive: Math.random() > 0.3, // 70% chance to be OK to drive
      repairTimeEstimate: repairTimeEstimate,
      deviationTimeEstimate: deviationTimeEstimate,
      missingPartsTimeEstimate: missingPartsTimeEstimate,
      repairType: repairType,
      repairAreaNeeded: getRandomElement(REPAIR_AREAS),
      deliveryDate: deliveryDate,
      customerPriority: customerPriority as Truck['customerPriority'],
      assignedOperatorId: null, // Initially no assigned operator
      status: status, // Will be updated by AppContext based on parts/overdue
    });
  }

  // Adjust critical priority trucks to be fewer (approx 5%)
  const criticalTrucksCount = Math.floor(count * 0.05);
  
  // Reset existing critical trucks to medium/high if they exceed the new count
  let currentCriticalCount = trucks.filter(t => t.customerPriority === 'Critical').length;
  while (currentCriticalCount > criticalTrucksCount) {
    const truckToDemote = getRandomElement(trucks.filter(t => t.customerPriority === 'Critical'));
    if (truckToDemote) {
      truckToDemote.customerPriority = getRandomElement(['Medium', 'High']);
      currentCriticalCount--;
    }
  }

  // Promote non-critical trucks to critical until the target count is met
  let promotedCount = 0;
  for (let i = 0; i < trucks.length && promotedCount < criticalTrucksCount; i++) {
    const truck = trucks[i];
    if (truck.customerPriority !== 'Critical' && truck.status !== 'Completed') {
      truck.customerPriority = 'Critical';
      truck.deliveryDate = addDays(now, getRandomNumber(1, 3)); // Very soon
      
      // Ensure critical trucks have work if they don't already
      const hasWork = truck.deviations.length > 0 || truck.missingParts.length > 0 || truck.customerAdaptationWork !== null;
      if (!hasWork) {
        // Add a high severity deviation if no work exists
        truck.deviations.push({ id: `DEV-CRIT-${i}`, description: 'Critical system malfunction', severity: 'High', completed: false, completedBy: null, completedAt: null });
        truck.deviationTimeEstimate = getRandomRepairTime(4, 8); // Critical trucks might need more time
        truck.repairTimeEstimate = (truck.deviationTimeEstimate || 0) + (truck.missingPartsTimeEstimate || 0) + (truck.customerAdaptationTimeEstimate || 0);
        truck.repairType = inferRepairType(truck.deviations, truck.missingParts, truck.customerAdaptationWork);
      } else {
        // If work exists, ensure repair time is substantial
        if (truck.repairTimeEstimate < 4) {
          truck.repairTimeEstimate = getRandomRepairTime(4, 8);
        }
      }
      
      truck.assignedOperatorId = null;
      truck.status = 'Pending';
      promotedCount++;
    }
  }

  // Ensure some trucks have missing parts that are not available
  for (let i = 0; i < Math.min(5, count / 10); i++) {
    const truck = getRandomElement(trucks.filter(t => t.status !== 'Completed' && t.missingParts.every(mp => mp.status === 'Available')));
    if (truck) {
      truck.missingParts.push({
        id: `PART-PENDING-${i}`,
        name: getRandomElement(['Specialized Tool', 'Rare Component']),
        status: getRandomElement(['Ordered', 'In Transit']),
        promisedDeliveryDate: addDays(now, getRandomNumber(7, 21)),
        completed: false,
        completedBy: null,
        completedAt: null,
      });
      truck.status = 'Pending'; // Will be categorized as 'Missing Parts Not Available'
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

  // Shuffle names and pick unique ones
  const shuffledNames = [...allOperatorNames].sort(() => 0.5 - Math.random());
  const uniqueNames = shuffledNames.slice(0, Math.min(count, shuffledNames.length));

  for (let i = 0; i < count; i++) {
    const shiftType = getRandomElement(SHIFTS);
    let shiftStartTime: Date;
    let shiftEndTime: Date;

    if (shiftType === 'Early') {
      shiftStartTime = setMilliseconds(setSeconds(setMinutes(setHours(now, 6), 0), 0), 0); // 06:00:00
      shiftEndTime = setMilliseconds(setSeconds(setMinutes(setHours(now, 14), 0), 0), 0); // 14:00:00
    } else { // Late Shift
      shiftStartTime = setMilliseconds(setSeconds(setMinutes(setHours(now, 14), 0), 0), 0); // 14:00:00
      shiftEndTime = setMilliseconds(setSeconds(setMinutes(setHours(now, 22), 0), 0), 0); // 22:00:00
    }

    const competencies: RepairType[] = [];
    const numCompetencies = getRandomNumber(1, REPAIR_TYPES.length);
    const shuffledRepairTypes = [...REPAIR_TYPES].sort(() => 0.5 - Math.random());
    for (let j = 0; j < numCompetencies; j++) {
      competencies.push(shuffledRepairTypes[j]);
    }

    const operator: Operator = {
      id: `OP-${i + 1}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: uniqueNames[i] || `Operator ${i + 1}`, // Use unique name, fallback if count > uniqueNames.length
      competencies: competencies,
      status: 'Available', // All operators initially available
      shiftStartTime: shiftStartTime,
      shiftEndTime: shiftEndTime,
      shift: shiftType, // Assign shift type
      assignedTrucks: [], // No assigned trucks initially
      efficiency: parseFloat((Math.random() * (1.0 - 0.7) + 0.7).toFixed(2)), // 0.7 to 1.0
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

  // Check for pending missing parts first
  const pendingMissingParts = truck.missingParts.filter(
    (mp) => mp.status !== 'Available' && !mp.completed
  );

  if (pendingMissingParts.length > 0) {
    // If there are any pending missing parts, this truck is NOT ready for planning.
    // Assign a very low score to ensure it's at the bottom of the priority list.
    // This effectively means it's "not yet ready to be planned for repair."
    // We return a score of 0 and a breakdown reflecting this.
    return {
      ...breakdown,
      totalScore: 0,
      missingPartsAvailability: -100, // Indicate a strong penalty
    };
  }

  // If all parts are available (or no parts are missing), proceed with normal scoring
  // 1. Delivery Date (Primary factor, Max 100 points + Overdue bonus)
  const daysUntilDelivery = differenceInDays(truck.deliveryDate, now);
  if (isPast(truck.deliveryDate, now)) { // Overdue
    breakdown.deliveryDate = 100 + Math.min(50, Math.abs(daysUntilDelivery) * 5); // Bonus for how long it's overdue (max +50)
  } else if (daysUntilDelivery <= 0) { // Due today
    breakdown.deliveryDate = 100;
  } else if (daysUntilDelivery === 1) { // Due tomorrow
    breakdown.deliveryDate = 90;
  } else if (daysUntilDelivery <= 3) { // Due in 2-3 days
    breakdown.deliveryDate = 70;
  } else if (daysUntilDelivery <= 7) { // Due in 4-7 days
    breakdown.deliveryDate = 50;
  } else { // Further dates, decreasing score
    breakdown.deliveryDate = Math.max(0, 30 - (daysUntilDelivery - 7) * 1); // More aggressive drop
  }
  score += breakdown.deliveryDate;

  // 2. Customer Priority (Secondary factor, Max 50 points)
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

  // 3. Missing Parts Availability (Bonus for all available, already handled by early exit)
  // If we reach here, all parts are available. Add a significant bonus.
  if (truck.missingParts.length > 0 && pendingMissingParts.length === 0) {
    breakdown.missingPartsAvailability = 20; // Strong bonus for having all parts available
  }
  score += breakdown.missingPartsAvailability;

  // 4. Deviations (Max 10 points per High, up to 20 points total)
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

  // 5. Customer Adaptation Work (Max 5 points)
  if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
    breakdown.customerAdaptationWork = 5;
  }
  score += breakdown.customerAdaptationWork;

  // 6. OK to Drive (Max 5 points) - if not OK, slight priority increase as it might be blocking
  if (!truck.okToDrive) {
    breakdown.okToDrive = 5;
  }
  score += breakdown.okToDrive;

  // 7. Repair Time Estimate (Penalty, Max -10 points)
  // Scale 0-24 hours to 0-10 penalty
  // Consider both repairTimeEstimate and customerAdaptationTimeEstimate for penalty
  const totalEstimatedWorkTime = truck.repairTimeEstimate; // repairTimeEstimate is now the total
  breakdown.repairTimeEstimatePenalty = -Math.min(10, (totalEstimatedWorkTime / 24) * 10);
  score += breakdown.repairTimeEstimatePenalty;

  // Ensure total score is within 0-200 range
  const totalScore = Math.max(0, Math.min(200, Math.round(score)));

  return {
    ...breakdown,
    totalScore: totalScore,
  };
}

export function getAvailableShiftHours(operator: Operator): number {
  const now = new Date();
  const shiftEnd = operator.shiftEndTime;

  // If shift has already ended or operator is off duty/on break, no available hours
  if (isBefore(shiftEnd, now) || operator.status === 'Off Duty' || operator.status === 'On Break') {
    return 0;
  }

  // Calculate remaining time in current shift
  const remainingTimeMs = shiftEnd.getTime() - now.getTime();
  const remainingHours = remainingTimeMs / (1000 * 60 * 60);

  // Subtract time for already assigned trucks, including customer adaptation time
  const assignedWorkload = operator.assignedTrucks.reduce((sum, truck) => 
    sum + truck.repairTimeEstimate
  , 0);

  return Math.max(0, remainingHours - assignedWorkload);
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
    case 'Not Ready':
      return 'bg-gray-300 text-gray-900';
    case 'Overdue - Ready to Plan':
      return 'bg-red-400 text-white';
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
    return 'bg-red-500 text-white'; // Critical
  } else if (score >= 100) {
    return 'bg-orange-500 text-white'; // High
  } else if (score >= 50) {
    return 'bg-yellow-500 text-black'; // Medium
  } else {
    return 'bg-green-500 text-white'; // Low
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
