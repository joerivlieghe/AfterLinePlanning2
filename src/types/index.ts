export type TruckStatus = 'Pending' | 'In Progress' | 'Partial' | 'Completed' | 'Overdue' | 'Missing Parts Not Available' | 'Assigned' | 'Ready to Finish' | 'Overdue - Not Ready' | 'Not Ready' | 'Overdue - Ready to Plan' | 'Ready to Plan';
export type RepairType = 'Mechanical' | 'Electrical' | 'Software' | 'Paint' | 'Customer Adaptation - Mechanical' | 'Customer Adaptation - Paint';
export type RepairArea = 'Bay 1' | 'Bay 2' | 'Bay 3' | 'Bay 4' | 'Bay 5' | 'Bay 6';
export type MissingPartStatus = 'Ordered' | 'In Transit' | 'Available';
export type OperatorStatus = 'Available' | 'Busy' | 'On Break' | 'Off Duty';
export type Shift = 'Early' | 'Late';
export type PaintBoothType = 'Small' | 'Large';

export interface Deviation {
  id: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
  timeEstimate?: number;
}

export interface MissingPart {
  id: string;
  name: string;
  status: MissingPartStatus;
  promisedDeliveryDate: Date;
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
  timeEstimate?: number;
}

export interface Truck {
  id: string;
  chassisNumber: string;
  deviations: Deviation[];
  missingParts: MissingPart[];
  customerAdaptationWork: string | null;
  customerAdaptationTimeEstimate?: number;
  customerAdaptationCompleted?: boolean;
  customerAdaptationCompletedBy?: string | null;
  customerAdaptationCompletedAt?: Date | null;
  customerAdaptationType?: 'Mechanical' | 'Paint'; // Updated: Removed 'General'
  paintDetails?: { // New field for paint-specific details
    color: string;
    paintBoothType: PaintBoothType;
  };
  okToDrive: boolean;
  repairTimeEstimate: number; // This will now be the primary estimate for its main repair type
  deviationTimeEstimate?: number; // Raw deviation time
  missingPartsTimeEstimate?: number; // Raw missing parts time
  repairType: RepairType;
  repairAreaNeeded: RepairArea;
  deliveryDate: Date;
  customerPriority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedOperatorIds: string[];
  status: TruckStatus;
  projectCode?: string;
  customer: string; // New field
  market: string; // New field
  invoiceDate: Date; // New field
}

export interface Operator {
  id: string;
  name: string;
  competencies: RepairType[];
  status: OperatorStatus;
  shiftStartTime: Date;
  shiftEndTime: Date;
  shift: Shift;
  assignedTrucks: Truck[];
  efficiency: number;
}

export interface ScheduledTruckDetail {
  truckId: string;
  chassisNumber: string;
  repairType: RepairType;
  hoursScheduled: number;
  paintBoothType?: PaintBoothType; // Optional for general repair
  operatorId?: string; // For general repair
  operatorName?: string; // For general repair
}

export interface DailyPaintBoothOccupancy {
  date: string;
  // Total hours for chart (stacked)
  totalScheduledHours: number;
  // Granular hours for clustered/stacked chart
  smallBoothPaintHours: number;
  smallBoothCAPaintHours: number;
  largeBoothPaintHours: number;
  largeBoothCAPaintHours: number;
  // Capacity tracking
  smallBoothScheduledHours: number;
  largeBoothScheduledHours: number;
  availableCapacity: number; // Total available capacity
  capacityProblem: boolean;
  // Details for daily schedule tables
  smallBoothScheduledTrucksDetails: ScheduledTruckDetail[];
  largeBoothScheduledTrucksDetails: ScheduledTruckDetail[];
}

export interface DailyOperatorOccupancy {
  date: string;
  totalScheduledHours: number;
  availableCapacity: number; // Total available operator hours for the day
  capacityProblem: boolean;
  scheduledTrucksDetails: ScheduledTruckDetail[];
  operatorWorkload: {
    [operatorId: string]: {
      operatorName: string;
      hoursScheduled: number;
      trucks: { truckId: string; chassisNumber: string; hours: number }[];
    };
  };
}

export interface TruckPlanningSummary {
  truck: Truck;
  paintSchedule: { date: string; boothType: PaintBoothType; hours: number }[];
  generalRepairSchedule: { date: string; operatorName: string; hours: number }[];
  estimatedPaintCompletionDate: Date | null;
  estimatedGeneralRepairCompletionDate: Date | null;
  overallEstimatedCompletionDate: Date | null;
  isProjectedOverdue: boolean;
  isPlanningAccepted: boolean; // Conceptual for "Accept/Assign"
}
