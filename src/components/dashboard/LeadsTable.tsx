import React, { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Lead } from "../../types";
import { Phone, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { updateLeadStatus } from "../../services/api";
import { SyncLoader } from "react-spinners";
import { CustomKpi } from "../../types/types";

interface LeadsTableProps {
  leads: Lead[];
  onStatusUpdate: (index: string, newStatus: string) => void;
  isLoading?: boolean;
  viewingUserPhone: string;
  customKpis: CustomKpi[];
}

// const STATUS_OPTIONS = ["New Lead", "Meeting Done", "Deal Done"];

const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onStatusUpdate,
  isLoading = false,
  viewingUserPhone,
  customKpis,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Lead;
    direction: "asc" | "desc";
  }>({
    key: "created_time",
    direction: "desc",
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const itemsPerPage = 20;

  // Parse comments into a map of label→value
  const parseComments = (comments: string) => {
    const parts = comments.split(/📢|👤|📞|📍|💰|👶|🏆/).filter(Boolean);
    const labels = [
      "Ad Details",
      "Name",
      "Number",
      "PreSchool Owner",
      "Location",
      "Fees",
      "Strength",
      "Lead Score",
    ];
    return parts.map((txt, i) => {
      const value = txt.replace(/^[:\s]+/, "");
      return { label: labels[i] || `Field ${i + 1}`, value };
    });
  };

  // Combine default and custom statuses
  const statusOptions = useMemo(() => {
    const customStatuses = customKpis.map((kpi) => kpi.label);
    return ["New Lead", "Meeting Done", "Deal Done", ...customStatuses];
  }, [customKpis]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingStatus(leadId);
    try {
      await updateLeadStatus(leadId, newStatus, viewingUserPhone); // Pass viewingUserPhone
      onStatusUpdate(leadId, newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Filter leads based on search term and filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.whatsapp_number_.includes(searchTerm) ||
        lead.comments.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || lead.lead_status === statusFilter;
      const matchesPlatform =
        platformFilter === "all" || lead.platform === platformFilter;

      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [leads, searchTerm, statusFilter, platformFilter]);

  // Apply sorting
  const sortedLeads = useMemo(() => {
    const leadsToSort = [...filteredLeads];

    if (sortConfig) {
      leadsToSort.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || bValue === undefined) {
          return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sort by created_time in descending order
      leadsToSort.sort((a, b) => {
        const aTime = new Date(a.created_time).getTime();
        const bTime = new Date(b.created_time).getTime();
        return bTime - aTime; // descending
      });
    }

    return leadsToSort;
  }, [filteredLeads, sortConfig]);

  // Apply pagination
  const paginatedLeads = useMemo(() => {
    return sortedLeads.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedLeads, currentPage]);

  const requestSort = (key: keyof Lead) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Lead) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4 inline" />
    );
  };

  // Get unique statuses for filter dropdown
  const statuses = Array.from(
    new Set(leads.map((lead) => lead.lead_status))
  ).filter(Boolean);

  // Get unique platforms for filter dropdown
  const platforms = Array.from(
    new Set(leads.map((lead) => lead.platform))
  ).filter(Boolean);

  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy hh:mm a");
    } catch {
      return dateString;
    }
  };

  // Extract location from comments
  const extractLocation = (comments: string) => {
    const locationMatch = comments.match(/📍 Location: ([^\n]+)/);
    return locationMatch ? locationMatch[1] : "N/A";
  };

  const extractScore = (comments: string) => {
    const scoreMatch = comments.match(/🏆 Lead Score: (\d+)/);
    return scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  };

  // Status badge colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "meeting done":
        return "bg-blue-100 text-blue-800";
      case "deal done":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SyncLoader color="#3b82f6" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-100 border-2 border-dashed rounded-xl w-16 h-16 mx-auto flex items-center justify-center">
          <X className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No leads found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          There are no leads to display at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search leads by name, number, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 pl-10 text-sm shadow-sm placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-0 sm:ml-4 flex space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
            >
              <option value="all">All Platforms</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                // onClick={() => requestSort("name")}
              >
                <div className="flex items-center">
                  Name
                  {/* {getSortIndicator("name")} */}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                // onClick={() => requestSort("whatsapp_number_")}
              >
                <div className="flex items-center">
                  WhatsApp
                  {/* {getSortIndicator("whatsapp_number_")} */}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Location
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Platform
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Lead Score
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort("created_time")}
              >
                <div className="flex items-center">
                  Date
                  {getSortIndicator("created_time")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedLeads.map((lead) => (
              <React.Fragment key={lead.id}>
                <tr className="hover:bg-gray-50 transition-colors duration-150">
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    onClick={() =>
                      setExpandedRow(expandedRow === lead.id ? null : lead.id!)
                    }
                  >
                    <div className="flex items-center">
                      {lead.name}
                      {expandedRow === lead.id ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Phone size={16} className="text-gray-400 mr-2" />
                      <div className="text-sm text-gray-500">
                        {lead.whatsapp_number_}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {extractLocation(lead.comments)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 uppercase">
                      {lead.platform}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {extractScore(lead.comments)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDate(lead.created_time)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        lead.lead_status
                      )}`}
                    >
                      {lead.lead_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <a
                        href={`https://web.whatsapp.com/send?phone=${lead.whatsapp_number_}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900"
                        title="Open WhatsApp"
                      >
                        <ExternalLink size={16} />
                      </a>

                      <div className="relative">
                        <select
                          value={lead.lead_status}
                          onChange={(e) =>
                            handleStatusChange(lead.id!, e.target.value)
                          }
                          disabled={updatingStatus === lead.id}
                          className={`bg-gray-100 border border-gray-300 text-gray-800 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            updatingStatus === lead.id
                              ? "cursor-not-allowed opacity-70"
                              : ""
                          }`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        {updatingStatus === lead.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
                            <SyncLoader size={5} color="#3b82f6" />
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                {expandedRow === lead.id && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 bg-gray-50">
                      <div className="flex flex-col md:flex-row md:space-x-10 space-y-2 md:space-y-0">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">
                            Contact Info
                          </h4>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Name:</span>{" "}
                            {lead.name}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Phone:</span>{" "}
                            {lead.whatsapp_number_ || "N/A"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">
                            Details
                          </h4>
                          {parseComments(lead.comments).map(
                            ({ label, value }, i) => (
                              <p key={i} className="text-sm text-gray-700">
                                <span className="font-medium">{label}:</span>{" "}
                                {value}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between items-center">
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, sortedLeads.length)}
              </span>{" "}
              of <span className="font-medium">{sortedLeads.length}</span> leads
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 text-sm rounded-md ${
                  currentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-blue-600 hover:bg-blue-50 border border-blue-600"
                }`}
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className={`px-4 py-2 text-sm rounded-md ${
                  currentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsTable;

// Helper component for the "X" icon
const X = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
