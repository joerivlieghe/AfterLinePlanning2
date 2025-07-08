export type TruckStatus = 'Pending' | 'In Progress' | 'Partial' | 'Completed' | 'Overdue' | 'Missing Parts Not Available' | 'Assigned' | 'Ready to Finish' | 'Overdue - Not Ready' | 'Not Ready' | 'Overdue - Ready to Plan' | 'Ready to Plan';
export type RepairType = 'Mechanical' | 'Electrical' | 'Software' | 'Paint' | 'Customer Adaptation'; // Added Customer Adaptation
export type RepairArea = 'Bay 1' | 'Bay 2' | 'Bay 3' | 'Bay 4' | 'Bay 5' | 'Bay 6';
export type MissingPartStatus = 'Ordered' | 'In Transit' | 'Available';
export type OperatorStatus = 'Available' | 'Busy' | 'On Break' | 'Off Duty';
export type Shift = 'Early' | 'Late'; // Added Shift type

export interface Deviation {
  id: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  completed: boolean;
  completedBy: string | null;
  completedAt: Date | null;
  timeEstimate?: number; // New field: Estimated time for this specific deviation
}

export interface MissingPart {
  id: string;
  name: string;
  status: MissingPartStatus;
  promisedDeliveryDate: Date;
  completed: boolean; // Indicates if the part has been physically installed/addressed
  completedBy: string | null;
  completedAt: Date | null;
}

export interface Truck {
  id: string;
  chassisNumber: string; // Replaces vin and model for display
  deviations: Deviation[];
  missingParts: MissingPart[];
  customerAdaptationWork: string | null;
  customerAdaptationTimeEstimate?: number; // Added for customer adaptation work time estimate
  customerAdaptationCompleted?: boolean; // Added for customer adaptation work completion
  customerAdaptationCompletedBy?: string | null;
  customerAdaptationCompletedAt?: Date | null;
  okToDrive: boolean;
  repairTimeEstimate: number; // Total estimated time for all repairs (deviations + missing parts + general repair)
  deviationTimeEstimate?: number; // New: Estimated time specifically for deviations
  missingPartsTimeEstimate?: number; // New: Estimated time specifically for missing parts
  repairType: RepairType;
  repairAreaNeeded: RepairArea;
  deliveryDate: Date;
  customerPriority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedOperatorId: string | null;
  status: TruckStatus;
}

export interface Operator {
  id: string;
  name: string;
  competencies: RepairType[];
  status: OperatorStatus;
  shiftStartTime: Date;
  shiftEndTime: Date;
  shift: Shift; // Added shift property
  assignedTrucks: Truck[];
  efficiency: number; // 0.0 - 1.0
}
