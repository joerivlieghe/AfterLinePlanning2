import { Truck, Operator, TruckStatus, RepairType, Shift, MissingPart } from './types';
import { v4 as uuidv4 } from 'uuid';
import { addDays, isSameDay, setHours, setMinutes, differenceInHours } from 'date-fns';

// Helper to generate a random date within a range
const getRandomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper to get a random element from an array
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to get a random subset of elements from an array
const getRandomSubset = <T>(arr: T[], min: number, max: number): T[] => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const REPAIR_TYPES: RepairType[] = ['Mechanical', 'Electrical', 'Software', 'Paint', 'Customer Adaptation'];
const DEVIATION_DESCRIPTIONS = [
  'Engine misfire', 'Brake system fault', 'Transmission fluid leak', 'Electrical short',
  'Software glitch', 'Paint scratch', 'Dent on chassis', 'Tire pressure low',
  'Headlight malfunction', 'Wiper blade issue', 'Fuel system clog', 'Exhaust leak',
  'Suspension noise', 'Steering alignment off', 'AC not cooling', 'Battery drain',
  'Door hinge squeak', 'Mirror adjustment fault', 'Seat belt retraction issue', 'Dashboard warning light'
];
const MISSING_PART_NAMES = [
  'Brake Pad Set', 'Oil Filter', 'Air Filter', 'Spark Plugs', 'Wiper Blades',
  'Headlight Bulb', 'Tail Light Assembly', 'Side Mirror', 'Alternator', 'Starter Motor',
  'Fuel Pump', 'Radiator Hose', 'Thermostat', 'Water Pump', 'Serpentine Belt',
  'Shock Absorber', 'Strut Assembly', 'Control Arm', 'Tie Rod End', 'Wheel Bearing'
];

const PROJECT_CODES = ['P-ALPHA', 'P-BETA', 'P-GAMMA']; // Limited to 3 project codes

export const generateTrucks = (count: number): Truck[] => {
  const trucks: Truck[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const hasDeviations = Math.random() < 0.7; // 70% chance of having deviations
    const hasMissingParts = Math.random() < 0.4; // 40% chance of having missing parts
    const hasCustomerAdaptation = Math.random() < 0.2; // 20% chance of customer adaptation work
    const isProjectTruck = Math.random() < 0.03; // 3% chance of being a project truck

    const deviations = hasDeviations
      ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map(() => ({
          id: uuidv4(),
          description: getRandomElement(DEVIATION_DESCRIPTIONS),
          estimatedHours: Math.floor(Math.random() * 8) + 1, // 1-8 hours
          completed: false,
          completedBy: null,
          completedAt: null,
          severity: getRandomElement(['Low', 'Medium', 'High']), // Add severity
          timeEstimate: Math.floor(Math.random() * 8) + 1, // Add timeEstimate
        }))
      : [];

    const missingParts = hasMissingParts
      ? Array.from({ length: Math.floor(Math.random() * 2) + 1 }).map(() => ({
          id: uuidv4(),
          name: getRandomElement(MISSING_PART_NAMES),
          status: getRandomElement(['Ordered', 'Available', 'Backordered']),
          estimatedHours: Math.floor(Math.random() * 5) + 1, // 1-5 hours
          completed: false,
          completedBy: null,
          completedAt: null,
        }))
      : [];

    const repairType = getRandomElement(REPAIR_TYPES);
    const customerPriorities: Truck['customerPriority'][] = ['Low', 'Medium', 'High', 'Critical'];

    const truck: Truck = {
      id: uuidv4(),
      chassisNumber: `TRUCK-${1000 + i}`,
      model: `Model ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
      status: 'Ready to Plan', // All trucks start as 'Ready to Plan'
      repairType: repairType,
      repairAreaNeeded: getRandomElement(['Engine Bay', 'Chassis', 'Cabin', 'Electrical System', 'Bodywork']), // Add repairAreaNeeded
      deliveryDate: getRandomDate(addDays(now, 1), addDays(now, 30)), // Add deliveryDate
      okToDrive: Math.random() < 0.8, // Add okToDrive
      customerPriority: getRandomElement(customerPriorities), // Add customerPriority
      deviations: deviations,
      missingParts: missingParts,
      customerAdaptationWork: hasCustomerAdaptation ? 'Custom Paint Job' : null, // Make it a string description
      customerAdaptationCompleted: false,
      customerAdaptationCompletedBy: null,
      customerAdaptationCompletedAt: null,
      customerAdaptationTimeEstimate: hasCustomerAdaptation ? Math.floor(Math.random() * 10) + 5 : 0, // Add time estimate for CA
      assignedOperatorIds: [],
      lastServiceDate: getRandomDate(addDays(now, -365), addDays(now, -30)),
      nextServiceDate: getRandomDate(addDays(now, 30), addDays(now, 365)),
      priority: Math.floor(Math.random() * 5) + 1, // 1-5, 5 being highest
      projectCode: isProjectTruck ? getRandomElement(PROJECT_CODES) : null,
      repairTimeEstimate: 0, // Will be calculated after creation
    };

    // Set initial status based on missing parts availability
    if (truck.missingParts.some(mp => mp.status !== 'Available' && !mp.completed)) {
      truck.status = 'Not Ready';
    } else if (calculateRemainingRepairTime(truck) === 0) {
      truck.status = 'Completed'; // If no work, mark as completed
    } else {
      truck.status = 'Ready to Plan';
    }

    // Ensure some trucks are 'Overdue - Not Ready' or 'Overdue - Ready to Plan'
    if (Math.random() < 0.15) { // 15% chance to be overdue
      if (truck.status === 'Not Ready') {
        truck.status = 'Overdue - Not Ready';
      } else if (truck.status === 'Ready to Plan') {
        truck.status = 'Overdue - Ready to Plan';
      }
    }

    truck.repairTimeEstimate = calculateRemainingRepairTime(truck);
    trucks.push(truck);
  }
  return trucks;
};

export const generateOperators = (count: number): Operator[] => {
  const operators: Operator[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const shift: Shift = Math.random() < 0.5 ? 'Early' : 'Late';
    const shiftStartTime = setMinutes(setHours(now, shift === 'Early' ? 6 : 14), 0);
    const shiftEndTime = setMinutes(setHours(now, shift === 'Early' ? 14 : 22), 0);

    operators.push({
      id: uuidv4(),
      name: `Operator ${String.fromCharCode(65 + i)}`,
      status: getRandomElement(['Available', 'Busy', 'On Break', 'Off Duty']),
      shift,
      shiftStartTime,
      shiftEndTime,
      competencies: getRandomSubset(REPAIR_TYPES, 1, 3),
      efficiency: parseFloat((Math.random() * (1.0 - 0.7) + 0.7).toFixed(2)), // 0.7 to 1.0
      assignedTruckIds: [],
    });
  }
  return operators;
};

export const calculateRemainingRepairTime = (truck: Truck): number => {
  let totalEstimatedHours = 0;

  truck.deviations.forEach(dev => {
    if (!dev.completed) {
      totalEstimatedHours += dev.timeEstimate || dev.estimatedHours; // Use timeEstimate if available
    }
  });

  truck.missingParts.forEach(part => {
    if (!part.completed && part.status === 'Available') { // Only count if part is available
      totalEstimatedHours += part.estimatedHours;
    }
  });

  if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
    totalEstimatedHours += truck.customerAdaptationTimeEstimate || 4; // Use specific estimate or default 4 hours
  }

  return totalEstimatedHours;
};

export const getPriorityScore = (truck: Truck): { totalScore: number; details: string[] } => {
  let score = 0;
  const details: string[] = [];

  // Base priority from truck data (1-5, 5 is highest)
  score += truck.priority * 2; // Max 10 points
  details.push(`Base Priority: ${truck.priority * 2}`);

  // Age of last service (older = higher priority)
  const daysSinceLastService = differenceInHours(new Date(), truck.lastServiceDate) / 24;
  if (daysSinceLastService > 180) { // Over 6 months
    score += 5;
    details.push(`Old Service: +5`);
  } else if (daysSinceLastService > 90) { // Over 3 months
    score += 2;
    details.push(`Medium Service: +2`);
  }

  // Number of deviations (more deviations = higher priority)
  const incompleteDeviations = truck.deviations.filter(d => !d.completed).length;
  score += incompleteDeviations * 3; // Max 9 points for 3 deviations
  details.push(`Deviations: ${incompleteDeviations * 3}`);

  // Missing parts status (backordered = higher priority to resolve)
  const backorderedParts = truck.missingParts.filter(p => p.status === 'Backordered' && !p.completed).length;
  score += backorderedParts * 5; // Max 10 points for 2 backordered parts
  details.push(`Backordered Parts: ${backorderedParts * 5}`);

  // Customer adaptation work (always high priority)
  if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
    score += 7;
    details.push(`Customer Adaptation: +7`);
  }

  // Status-based adjustments
  if (truck.status === 'Not Ready' || truck.status === 'Overdue - Not Ready') {
    score -= 10; // Lower priority if waiting for parts
    details.push(`Status Not Ready: -10`);
  } else if (truck.status === 'Overdue - Ready to Plan') {
    score += 10; // High priority if overdue
    details.push(`Status Overdue: +10`);
  }

  // Project code (project trucks might have higher priority)
  if (truck.projectCode) {
    score += 5; // Boost for project trucks
    details.push(`Project Truck: +5`);
  }

  // Customer Priority (new field)
  switch (truck.customerPriority) {
    case 'Critical':
      score += 15;
      details.push(`Customer Priority Critical: +15`);
      break;
    case 'High':
      score += 10;
      details.push(`Customer Priority High: +10`);
      break;
    case 'Medium':
      score += 5;
      details.push(`Customer Priority Medium: +5`);
      break;
    case 'Low':
    default:
      // No score added for low priority
      break;
  }

  return { totalScore: score, details };
};

export const getStatusColor = (status: TruckStatus | Operator['status']): string => {
  switch (status) {
    case 'Ready to Plan':
      return 'bg-blue-100 text-blue-800';
    case 'Assigned':
      return 'bg-yellow-100 text-yellow-800';
    case 'In Progress':
      return 'bg-orange-100 text-orange-800';
    case 'Ready to Finish':
      return 'bg-purple-100 text-purple-800';
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Not Ready':
      return 'bg-red-100 text-red-800';
    case 'Overdue - Not Ready':
      return 'bg-red-200 text-red-900';
    case 'Overdue - Ready to Plan':
      return 'bg-red-300 text-red-900';
    case 'Available':
      return 'bg-green-100 text-green-800';
    case 'Busy':
      return 'bg-red-100 text-red-800';
    case 'On Break':
      return 'bg-yellow-100 text-yellow-800';
    case 'Off Duty':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getEfficiencyColor = (efficiency: number): string => {
  if (efficiency >= 0.9) return 'text-green-600';
  if (efficiency >= 0.7) return 'text-yellow-600';
  return 'text-red-600';
};

export const getPriorityColor = (score: number): string => {
  if (score >= 30) return 'bg-red-500 text-white';
  if (score >= 20) return 'bg-orange-400 text-white';
  if (score >= 10) return 'bg-yellow-300 text-gray-800';
  return 'bg-green-200 text-green-800';
};

export const getSeverityColor = (severity: 'Low' | 'Medium' | 'High'): string => {
  switch (severity) {
    case 'Low':
      return 'text-green-500';
    case 'Medium':
      return 'text-yellow-500';
    case 'High':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

export const getMissingPartStatusColor = (status: MissingPart['status']): string => {
  switch (status) {
    case 'Ordered':
      return 'bg-yellow-500';
    case 'Available':
      return 'bg-green-500';
    case 'Backordered':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const getAvailableShiftHours = (operator: Operator, allTrucks: Truck[], planningDate: Date = new Date()): number => {
  const shiftStartOnPlanningDate = setMinutes(setHours(planningDate, operator.shiftStartTime.getHours()), operator.shiftStartTime.getMinutes());
  const shiftEndOnPlanningDate = setMinutes(setHours(planningDate, operator.shiftEndTime.getHours()), operator.shiftEndTime.getMinutes());

  let totalShiftDurationHours = differenceInHours(shiftEndOnPlanningDate, shiftStartOnPlanningDate);

  // If the planning date is today, adjust available hours based on current time
  if (isSameDay(planningDate, new Date())) {
    const now = new Date();
    if (now > shiftEndOnPlanningDate) {
      return 0; // Shift already ended
    } else if (now > shiftStartOnPlanningDate) {
      totalShiftDurationHours = differenceInHours(shiftEndOnPlanningDate, now);
    }
  }

  // Calculate current workload from assigned trucks
  const assignedWorkload = operator.assignedTruckIds.reduce((sum, truckId) => {
    const truck = allTrucks.find(t => t.id === truckId);
    // Only count remaining repair time for trucks that are not yet completed
    return sum + (truck && truck.status !== 'Completed' ? calculateRemainingRepairTime(truck) : 0);
  }, 0);

  return Math.max(0, totalShiftDurationHours - assignedWorkload);
};

export const CUSTOMER_PRIORITIES: Truck['customerPriority'][] = ['Low', 'Medium', 'High', 'Critical'];
