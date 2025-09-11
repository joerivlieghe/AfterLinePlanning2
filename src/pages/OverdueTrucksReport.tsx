import React, { useState, useCallback, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { formatDate, getSeverityColor, getPriorityScore } from '@/lib/data';
import { Truck, Deviation, MissingPart, TruckStatus } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, ExternalLink, ArrowUpNarrowWide, ArrowDownWideNarrow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortColumn = 'calculatedDueDate' | 'priorityScore' | null;
type SortDirection = 'asc' | 'desc';

const OverdueTrucksReport: React.FC = () => {
  const { overdueTrucksForReport, markTruckReadyForDeliveryWithOpenIssues, getCalculatedDueDate } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<{ [truckId: string]: string }>({});
  const [filterChassisNumber, setFilterChassisNumber] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [showMissingPartsOnly, setShowMissingPartsOnly] = useState(false);
  const [showNoOpenDeviationsOnly, setShowNoOpenDeviationsOnly] = useState(false); // Renamed state for "no open deviations" filter
  const [filterStatus, setFilterStatus] = useState<TruckStatus | 'All'>('All');
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleNotesChange = useCallback((truckId: string, value: string) => {
    setNotes(prev => ({ ...prev, [truckId]: value }));
  }, []);

  const handleMarkReadyForDelivery = useCallback((truck: Truck) => {
    const decisionNotes = notes[truck.id] || 'No specific notes provided.';
    markTruckReadyForDeliveryWithOpenIssues(truck.id, decisionNotes);
    toast({
      title: 'Truck Status Updated',
      description: `Truck ${truck.chassisNumber} marked as "Ready for Delivery with Open Issues".`,
      variant: 'success',
    });
  }, [notes, markTruckReadyForDeliveryWithOpenIssues, toast]);

  const generateReport = useCallback(() => {
    const reportData = overdueTrucksForReport
      .filter(truck => truck.readyForDeliveryWithOpenIssues)
      .map(truck => ({
        truckId: truck.id,
        chassisNumber: truck.chassisNumber,
        model: truck.model,
        deliveryDate: formatDate(truck.deliveryDate),
        invoiceDate: formatDate(truck.invoiceDate),
        customer: truck.customer,
        market: truck.market,
        status: truck.status,
        readyForDeliveryWithOpenIssues: truck.readyForDeliveryWithOpenIssues,
        deliveryDecisionNotes: truck.deliveryDecisionNotes,
        openDeviations: truck.deviations
          .filter(dev => !dev.completed)
          .map(dev => ({
            id: dev.id,
            description: dev.description,
            type: dev.type,
            severity: dev.severity,
            timeEstimate: dev.timeEstimate,
          })),
        openMissingParts: truck.missingParts
          .filter(mp => !mp.completed)
          .map(mp => ({
            id: mp.id,
            name: mp.name,
            status: mp.status,
            estimatedArrival: formatDate(mp.estimatedArrival),
            timeEstimate: mp.timeEstimate,
          })),
      }));

    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overdue_trucks_delivery_report_${formatDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Generated',
      description: 'Overdue trucks delivery report downloaded successfully.',
      variant: 'success',
    });
  }, [overdueTrucksForReport, toast]);

  const renderDeviations = (deviations: Deviation[]) => {
    const openDeviations = deviations.filter(d => !d.completed);
    if (openDeviations.length === 0) return <span className="text-green-600">None</span>;
    return (
      <ul className="list-disc list-inside text-sm">
        {openDeviations.map(dev => (
          <li key={dev.id} className={`${getSeverityColor(dev.severity)}`}>
            {dev.description} ({dev.type}, {dev.timeEstimate || 0}h)
          </li>
        ))}
      </ul>
    );
  };

  const renderMissingPartsNames = (missingParts: MissingPart[]) => {
    const openMissingParts = missingParts.filter(mp => !mp.completed);
    if (openMissingParts.length === 0) return <span className="text-green-600">None</span>;
    return (
      <ul className="list-disc list-inside text-sm">
        {openMissingParts.map(mp => (
          <li key={mp.id} className="text-orange-600">
            {mp.name}
          </li>
        ))}
      </ul>
    );
  };

  const renderMissingPartsAvailability = (missingParts: MissingPart[]) => {
    const openMissingParts = missingParts.filter(mp => !mp.completed);
    if (openMissingParts.length === 0) return <span className="text-green-600">N/A</span>;
    return (
      <ul className="list-disc list-inside text-sm">
        {openMissingParts.map(mp => (
          <li key={mp.id} className="text-orange-600">
            {mp.status === 'Available' ? 'Available' : `ETA: ${formatDate(mp.estimatedArrival)}`}
          </li>
        ))}
      </ul>
    );
  };

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const filteredAndSortedTrucks = useMemo(() => {
    let currentTrucks = overdueTrucksForReport.map(truck => {
      if (truck.priorityScore === undefined || truck.priorityReasons === undefined) {
        const calculatedDueDate = getCalculatedDueDate(truck);
        const { totalScore, reasons } = getPriorityScore(truck, calculatedDueDate);
        return { ...truck, priorityScore: totalScore, priorityReasons: reasons };
      }
      return truck;
    }).filter(truck => {
      const matchesChassis = truck.chassisNumber.toLowerCase().includes(filterChassisNumber.toLowerCase());
      const matchesModel = truck.model.toLowerCase().includes(filterModel.toLowerCase());
      const matchesCustomer = truck.customer.toLowerCase().includes(filterCustomer.toLowerCase());
      const matchesMarket = truck.market.toLowerCase().includes(filterMarket.toLowerCase());
      const hasOpenMissingParts = truck.missingParts.some(mp => !mp.completed);
      const hasOpenDeviations = truck.deviations.some(dev => !dev.completed);
      const matchesStatus = filterStatus === 'All' || truck.status === filterStatus;

      return (
        matchesChassis &&
        matchesModel &&
        matchesCustomer &&
        matchesMarket &&
        (!showMissingPartsOnly || hasOpenMissingParts) &&
        (!showNoOpenDeviationsOnly || !hasOpenDeviations) && // Updated filter condition
        matchesStatus
      );
    });

    if (sortColumn) {
      currentTrucks.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortColumn === 'calculatedDueDate') {
          valA = getCalculatedDueDate(a)?.getTime() || 0;
          valB = getCalculatedDueDate(b)?.getTime() || 0;
        } else if (sortColumn === 'priorityScore') {
          valA = a.priorityScore || 0;
          valB = b.priorityScore || 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return currentTrucks;
  }, [
    overdueTrucksForReport,
    filterChassisNumber,
    filterModel,
    filterCustomer,
    filterMarket,
    showMissingPartsOnly,
    showNoOpenDeviationsOnly, // Updated to new state variable
    filterStatus,
    sortColumn,
    sortDirection,
    getCalculatedDueDate,
    getPriorityScore,
  ]);

  const truckStatuses: TruckStatus[] = [
    'Pending', 'In Progress', 'Partial', 'Completed', 'Overdue',
    'Missing Parts Not Available', 'Assigned', 'Ready to Finish',
    'Overdue - Not Ready', 'Not Ready', 'Overdue - Ready to Plan',
    'Ready to Plan', 'Ready for Delivery with Open Issues'
  ];

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUpNarrowWide className="ml-1 h-3 w-3" /> : <ArrowDownWideNarrow className="ml-1 h-3 w-3" />;
    }
    return null;
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Overdue Trucks Report</h1>

      <p className="mb-4 text-gray-700">
        This report lists trucks that are currently overdue and still have open deviations or missing parts.
        Review the details for each truck and decide if it should be flagged as "Ready for Delivery with Open Issues"
        to be fixed at the dealership or in the market.
      </p>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showMissingPartsOnly"
              checked={showMissingPartsOnly}
              onCheckedChange={(checked: boolean) => setShowMissingPartsOnly(checked)}
            />
            <Label htmlFor="showMissingPartsOnly">Show only trucks with open missing parts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showNoOpenDeviationsOnly" // Updated ID
              checked={showNoOpenDeviationsOnly}
              onCheckedChange={(checked: boolean) => setShowNoOpenDeviationsOnly(checked)} // Updated handler
            />
            <Label htmlFor="showNoOpenDeviationsOnly">Show only trucks with no open deviations</Label> {/* Updated label */}
          </div>
        </div>
        <Button onClick={generateReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Generate Report (JSON)
        </Button>
      </div>

      {filteredAndSortedTrucks.length === 0 ? (
        <p className="text-center text-lg text-gray-600 mt-10">No overdue trucks with open issues found matching your criteria.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  Chassis Number
                  <Input
                    placeholder="Filter chassis"
                    value={filterChassisNumber}
                    onChange={(e) => setFilterChassisNumber(e.target.value)}
                    className="mt-1 h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableHead>
                <TableHead>
                  Model
                  <Input
                    placeholder="Filter model"
                    value={filterModel}
                    onChange={(e) => setFilterModel(e.target.value)}
                    className="mt-1 h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableHead>
                <TableHead>
                  Customer
                  <Input
                    placeholder="Filter customer"
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="mt-1 h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableHead>
                <TableHead>
                  Market
                  <Input
                    placeholder="Filter market"
                    value={filterMarket}
                    onChange={(e) => setFilterMarket(e.target.value)}
                    className="mt-1 h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('calculatedDueDate')}>
                    Calculated Due Date {getSortIcon('calculatedDueDate')}
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort('priorityScore')}>
                    Priority Score {getSortIcon('priorityScore')}
                  </div>
                </TableHead>
                <TableHead>Open Deviations</TableHead>
                <TableHead>Missing Part</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>
                  Current Status
                  <Select value={filterStatus} onValueChange={(value: TruckStatus | 'All') => setFilterStatus(value)}>
                    <SelectTrigger className="mt-1 h-8 text-sm w-[160px]" onClick={(e) => e.stopPropagation()}>
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Statuses</SelectItem>
                      {truckStatuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead className="w-[200px]">Decision Notes</TableHead>
                <TableHead className="w-[150px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTrucks.map((truck) => (
                <TableRow
                  key={truck.id}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => navigate(`/trucks/${truck.id}`)}
                >
                  <TableCell className="font-medium flex items-center">
                    {truck.chassisNumber}
                    <ExternalLink className="ml-2 h-3 w-3 text-blue-500" />
                  </TableCell>
                  <TableCell>{truck.model}</TableCell>
                  <TableCell>{truck.customer}</TableCell>
                  <TableCell>{truck.market}</TableCell>
                  <TableCell className="text-red-600 font-semibold">{formatDate(getCalculatedDueDate(truck))}</TableCell>
                  <TableCell>{truck.priorityScore ?? 'N/A'}</TableCell>
                  <TableCell>{renderDeviations(truck.deviations)}</TableCell>
                  <TableCell>{renderMissingPartsNames(truck.missingParts)}</TableCell>
                  <TableCell>{renderMissingPartsAvailability(truck.missingParts)}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-red-500">{truck.status}</span>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={notes[truck.id] || ''}
                      onChange={(e) => handleNotesChange(truck.id, e.target.value)}
                      placeholder="Add decision notes..."
                      className="min-h-[60px]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkReadyForDelivery(truck);
                      }}
                      disabled={truck.readyForDeliveryWithOpenIssues}
                      className="w-full"
                    >
                      {truck.readyForDeliveryWithOpenIssues ? 'Flagged for Delivery' : 'Flag for Delivery'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default OverdueTrucksReport;
