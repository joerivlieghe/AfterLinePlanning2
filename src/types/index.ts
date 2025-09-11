export type TruckStatus = 'Pending' | 'In Progress' | 'Partial' | 'Completed' | 'Overdue' | 'Missing Parts Not Available' | 'Assigned' | 'Ready to Finish' | 'Overdue - Not Ready' | 'Not Ready' | 'Overdue - Ready to Plan' | 'Ready to Plan' | 'Ready for Delivery with Open Issues';
export type RepairType = 'Mechanical' | 'Electrical' | 'Software' | 'Paint' | 'Customer Adaptation - Mechanical' | 'Customer Adaptation - Paint';
export type RepairArea = 'Bay 1' | 'Bay 2' | 'Bay 3' | 'Bay 4' | 'Bay 5' | 'Bay 6';
export type MissingPartStatus = 'Ordered' | 'In Transit' | 'Available' | 'Installed';
export type OperatorStatus = 'Available' | 'Busy' | 'On Break' | 'Off Duty';
export type Shift = 'Early' | 'Late';
export type PaintBoothType = 'Small' | 'Large';
export type Market = 'Germany' | 'France' | 'Spain' | 'Italy' | 'United Kingdom' | 'Sweden' | 'Norway' | 'Finland' | 'Denmark' | 'Netherlands' | 'Belgium' | 'Austria' | 'Switzerland' | 'Poland' | 'Czech Republic' | 'Portugal' | 'Ireland' | 'Greece';
export type CustomerPriority = 'Low' | 'Medium' | 'High' | 'Critical'; // Added CustomerPriority type

export interface Deviation {
  id: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
  timeEstimate?: number;
  type: RepairType; // Added type to Deviation
}

export interface MissingPart {
  id: string;
  name: string;
  status: MissingPartStatus;
  orderDate: Date; // Changed from promisedDeliveryDate
  estimatedArrival: Date; // New field
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
  timeEstimate?: number;
}

export interface Truck {
  id: string;
  name: string; // Added name field
  chassisNumber: string;
  model: string; // Added model field
  year: number; // Added year field
  deviations: Deviation[];
  missingParts: MissingPart[];
  customerAdaptationWork: string | null;
  customerAdaptationTimeEstimate?: number;
  customerAdaptationCompleted?: boolean;
  customerAdaptationCompletedBy?: string | null;
  customerAdaptationCompletedAt?: Date | null;
  customerAdaptationType?: 'Mechanical' | 'Paint';
  paintDetails?: {
    color: string;
    paintBoothType: PaintBoothType;
  };
  okToDrive?: boolean; // Made optional
  repairTimeEstimate: number;
  deviationTimeEstimate?: number;
  missingPartsTimeEstimate?: number;
  repairType?: RepairType; // Made optional
  repairAreaNeeded?: RepairArea; // Made optional
  deliveryDate: Date;
  invoiceDate: Date;
  customer: string; // Added customer field
  customerPriority: CustomerPriority;
  assignedOperatorIds: string[];
  status: TruckStatus;
  projectCode?: string;
  customerDetails?: string; // Made optional
  market: Market;
  readyForDeliveryWithOpenIssues?: boolean; // New field
  deliveryDecisionNotes?: string; // New field
  priorityScore?: number; // Added for sorting
  priorityReasons?: string[]; // Added for sorting
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
  paintBoothType?: PaintBoothType;
  operatorId?: string;
  operatorName?: string;
}

export interface DailyPaintBoothOccupancy {
  date: string;
  totalScheduledHours: number;
  smallBoothPaintHours: number;
  smallBoothCAPaintHours: number;
  largeBoothPaintHours: number;
  largeBoothCAPaintHours: number;
  smallBoothScheduledHours: number;
  largeBoothScheduledHours: number;
  availableCapacity: number;
  capacityProblem: boolean;
  smallBoothScheduledTrucksDetails: ScheduledTruckDetail[];
  largeBoothScheduledTrucksDetails: ScheduledTruckDetail[];
}

export interface DailyOperatorOccupancy {
  date: string;
  totalScheduledHours: number;
  availableCapacity: number;
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
  isPlanningAccepted: boolean;
  priorityScore: number; // New field
  priorityReasons: string[]; // New field
}

export interface MarketInvoiceDelta {
  market: Market;
  deltaDays: number;
}
