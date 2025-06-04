import React, { useState, useMemo, useEffect } from "react";
import { format, parseISO, parse, isValid } from "date-fns";
import { Lead } from "../../types";
import { CustomKpi } from "../../types/types";
import {
  Phone,
  X,
  Pencil,
  MessageSquare,
  MessagesSquare,
  MessageCircle,
} from "lucide-react";
import {
  updateLeadStatus,
  scheduleFollowUp,
  updateCustomerComment,
} from "../../services/api";
import { SyncLoader } from "react-spinners";
import { FaBell, FaWhatsapp, FaFacebookF, FaInstagram } from "react-icons/fa";

interface LeadsTableProps {
  leads: Lead[];
  onStatusUpdate: (index: string, newStatus: string) => void;
  onFollowUpScheduled: (leadId: string, date: string, time: string) => void;
  onUpdateCustomerComment: (leadId: string, comment: string) => void;
  isLoading?: boolean;
  viewingUserPhone: string;
  customKpis: CustomKpi[];
}

const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onStatusUpdate,
  onFollowUpScheduled,
  onUpdateCustomerComment,
  isLoading = false,
  viewingUserPhone,
  customKpis,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [followUpLeadId, setFollowUpLeadId] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpTime, setFollowUpTime] = useState<string>("");
  const [customerComment, setCustomerComment] = useState("");
  const [isEditingCustomerComment, setIsEditingCustomerComment] =
    useState(false);

  const itemsPerPage = 20;

  // Combine default and custom statuses
  const statusOptions = useMemo(() => {
    const customStatuses = customKpis.map((kpi) => kpi.label);
    return ["New Lead", "Meeting Done", "Deal Done", ...customStatuses];
  }, [customKpis]);

  // Update customer comment when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      setCustomerComment(String(selectedLead.customerComment || ""));
    }
  }, [selectedLead]);

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

  // Get platform icon and color
  const getPlatformInfo = (platform: string | undefined) => {
    if (!platform) return { icon: null, color: "bg-gray-200 text-gray-800" };

    const platformLower = platform.toLowerCase();

    // Check shorthand names first
    if (platformLower === "ig")
      return {
        icon: <FaInstagram className="w-3 h-3" />,
        color: "bg-pink-100 text-pink-800",
      };

    if (platformLower === "fb")
      return {
        icon: <FaFacebookF className="w-3 h-3" />,
        color: "bg-blue-100 text-blue-800",
      };

    if (platformLower === "wa")
      return {
        icon: <FaWhatsapp className="w-3 h-3" />,
        color: "bg-green-100 text-green-800",
      };

    // Check regular platform names
    if (platformLower.includes("facebook"))
      return {
        icon: <FaFacebookF className="w-3 h-3" />,
        color: "bg-blue-100 text-blue-800",
      };

    if (platformLower.includes("instagram"))
      return {
        icon: <FaInstagram className="w-3 h-3" />,
        color: "bg-pink-100 text-pink-800",
      };

    if (platformLower.includes("google"))
      return {
        icon: <MessageSquare className="w-3 h-3" />,
        color: "bg-red-100 text-red-800",
      };

    if (platformLower.includes("zalo"))
      return {
        icon: <MessagesSquare className="w-3 h-3" />,
        color: "bg-blue-100 text-blue-800",
      };

    if (platformLower.includes("tiktok"))
      return {
        icon: <MessageCircle className="w-3 h-3" />,
        color: "bg-black text-white",
      };

    if (platformLower.includes("whatsapp"))
      return {
        icon: <FaWhatsapp className="w-3 h-3" />,
        color: "bg-green-100 text-green-800",
      };

    // Default fallback
    return {
      icon: (
        <span className="text-xs font-bold">
          {platform.substring(0, 2).toUpperCase()}
        </span>
      ),
      color: "bg-gray-200 text-gray-800",
    };
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingStatus(leadId);
    try {
      await updateLeadStatus(leadId, newStatus, viewingUserPhone);
      onStatusUpdate(leadId, newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleFollowUpClick = (leadId: string) => {
    if (followUpLeadId === leadId) {
      setFollowUpLeadId(null);
    } else {
      const lead = leads.find((l) => l.id === leadId);
      setFollowUpLeadId(leadId);
      setFollowUpDate(lead?.followUpDate ? String(lead.followUpDate) : "");
      setFollowUpTime(lead?.followUpTime ? String(lead.followUpTime) : "");
    }
  };

  const handleSchedule = async (leadId: string) => {
    try {
      const dateTime = new Date(`${followUpDate}T${followUpTime}:00`);
      await scheduleFollowUp(leadId, dateTime, followUpTime, viewingUserPhone);
      onFollowUpScheduled(leadId, followUpDate, followUpTime);
      setFollowUpLeadId(null);
    } catch (error) {
      console.error("Scheduling error:", error);
      alert("Failed to schedule follow-up. Please try again.");
    }
  };

  const openSidePanel = (lead: Lead) => {
    setSelectedLead(lead);
    setCustomerComment(String(lead.customerComment || ""));
    setIsEditingCustomerComment(false);
    setIsSidePanelOpen(true);
  };

  const closeSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedLead(null);
  };

  const handleSaveCustomerComment = async () => {
    if (selectedLead) {
      try {
        await updateCustomerComment(
          selectedLead.id!,
          customerComment,
          viewingUserPhone
        );
        onUpdateCustomerComment(selectedLead.id!, customerComment);
        setIsEditingCustomerComment(false);
      } catch (error) {
        console.error("Failed to save comment:", error);
        alert("Failed to save comment. Please try again.");
      }
    }
  };

  // Filter leads based on search term and filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.whatsapp_number_?.includes(searchTerm) ||
        lead.comments?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || lead.lead_status === statusFilter;
      const matchesPlatform =
        platformFilter === "all" || lead.platform === platformFilter;

      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [leads, searchTerm, statusFilter, platformFilter]);

  // Inside the LeadsTable component
  const parseLeadDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;

    // Try ISO format first
    try {
      const isoDate = parseISO(dateStr);
      if (isValid(isoDate)) return isoDate;
    } catch (e) {
      // Ignore and try custom format
    }

    // Try custom format: "MMM dd, yyyy hh:mm a"
    try {
      const customDate = parse(dateStr, "MMM dd, yyyy hh:mm a", new Date());
      if (isValid(customDate)) return customDate;
    } catch (e) {
      // Ignore parse errors
    }

    return null;
  };

  // Update the sortedLeads calculation
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const aDate = a.created_time ? parseLeadDate(a.created_time) : null;
      const bDate = b.created_time ? parseLeadDate(b.created_time) : null;

      const aTime = aDate ? aDate.getTime() : 0;
      const bTime = bDate ? bDate.getTime() : 0;

      return bTime - aTime; // Newest first
    });
  }, [filteredLeads]);

  // Apply pagination
  const paginatedLeads = useMemo(() => {
    return sortedLeads.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedLeads, currentPage]);

  // Get unique statuses for filter dropdown
  const statuses = Array.from(
    new Set(leads.map((lead) => lead.lead_status))
  ).filter(Boolean);

  // Get unique platforms for filter dropdown
  const platforms = Array.from(
    new Set(leads.map((lead) => lead.platform))
  ).filter(Boolean);

  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);

  // Update the formatDate function
  const formatDate = (dateString: string) => {
    const date = parseLeadDate(dateString);
    if (date) {
      return format(date, "MMM dd, yyyy hh:mm a");
    }
    return dateString;
  };

  // Extract location from comments
  const extractLocation = (comments: string) => {
    const locationMatch = comments.match(/📍 Location: ([^\n]+)/);
    return locationMatch ? locationMatch[1] : "N/A";
  };

  // Extract lead score from comments
  const extractScore = (comments: string) => {
    const scoreMatch = comments.match(/🏆 Lead Score: (\d+)/);
    return scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  };

  // Get color class based on lead score
  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500";
    if (score < 50) return "text-red-600 font-bold";
    if (score >= 50 && score <= 70) return "text-amber-600 font-bold";
    return "text-green-600 font-bold";
  };

  // Status badge colors
  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-100 text-gray-800";

    switch (status.toLowerCase()) {
      case "meeting done":
        return "bg-blue-100 text-blue-800";
      case "deal done":
      case "deal closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format field labels
  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Format field values
  const formatValue = (key: string, value: unknown) => {
    if (key === "created_time" && value) {
      return formatDate(String(value));
    }
    if (["followUpDate", "followUpTime"].includes(key)) {
      return value || "Not scheduled";
    }
    return value !== undefined && value !== null ? String(value) : "N/A";
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

  // Detail Card Component
  const DetailCard = ({
    label,
    value,
    statusColor,
  }: {
    label: string;
    value: string;
    statusColor?: string;
  }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200">
      <div className="flex items-start">
        <span className="font-medium text-gray-700 flex-shrink-0 w-32">
          {label}:
        </span>
        {statusColor ? (
          <span
            className={`${statusColor} px-2 py-1 rounded-full text-xs font-semibold`}
          >
            {value}
          </span>
        ) : (
          <span className="text-gray-900 font-medium flex-grow break-words">
            {value}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden relative">
      {/* Search and Filters */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
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

      <div className="flex flex-col md:flex-row h-[calc(100vh-150px)]">
        {/* Table Container */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isSidePanelOpen ? "w-full md:w-2/6" : "w-full"
          } overflow-hidden flex flex-col`}
        >
          <div className="overflow-auto flex-grow">
            <table className="min-w-full divide-y divide-gray-200">
              {!isSidePanelOpen && (
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Contact
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Platform
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Lead Score
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
              )}
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) => {
                    const score = extractScore(lead.comments || "");
                    const scoreColor = getScoreColor(score);
                    const platformInfo = getPlatformInfo(lead.platform);

                    // Extract valid initial from name
                    const getInitial = () => {
                      if (!lead.name) return "?";
                      const match = lead.name.match(/[a-zA-Z]/);
                      return match ? match[0].toUpperCase() : "?";
                    };

                    return (
                      <tr
                        key={lead.id}
                        className={`transition-colors duration-150 ${
                          isSidePanelOpen && selectedLead?.id === lead.id
                            ? "bg-blue-100"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {isSidePanelOpen ? (
                          <td className="px-4 py-3">
                            <div
                              className="flex items-center cursor-pointer"
                              onClick={() => openSidePanel(lead)}
                            >
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center mr-3">
                                <span className="text-blue-900 font-medium">
                                  {getInitial()}
                                </span>
                              </div>
                              <div className="min-w-0 flex-grow">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-sm font-bold truncate">
                                    {lead.name || "N/A"}
                                  </span>
                                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                    {lead.created_time
                                      ? formatDate(lead.created_time)
                                      : "N/A"}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-1">
                                  {lead.whatsapp_number_ || "N/A"}
                                </div>
                              </div>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td
                              className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer w-24 truncate"
                              onClick={() => openSidePanel(lead)}
                              title={lead.name || "N/A"}
                            >
                              {lead.name || "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <Phone
                                  size={16}
                                  className="text-gray-400 mr-2"
                                />
                                <div className="text-sm text-gray-500 truncate max-w-[120px]">
                                  {lead.whatsapp_number_ || "N/A"}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500 truncate max-w-[140px]">
                                {extractLocation(lead.comments || "")}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${platformInfo.color} font-bold`}
                                title={lead.platform || "Platform"}
                              >
                                {platformInfo.icon}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className={`text-sm ${scoreColor}`}>
                                {score ?? "N/A"}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 w-28">
                              {lead.created_time
                                ? formatDate(lead.created_time)
                                : "N/A"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={lead.lead_status || ""}
                                onChange={(e) =>
                                  handleStatusChange(lead.id!, e.target.value)
                                }
                                disabled={updatingStatus === lead.id}
                                className={`px-2 py-1 text-xs leading-5 font-semibold rounded-md ${getStatusColor(
                                  lead.lead_status
                                )} focus:outline-none focus:ring-1 focus:ring-blue-500 w-full ${
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
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium w-32">
                              <div className="flex items-center justify-end space-x-2">
                                <a
                                  href={`https://wa.me/${lead.whatsapp_number_}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-800"
                                  title="Open WhatsApp"
                                >
                                  <FaWhatsapp className="text-lg" />
                                </a>

                                <div
                                  className={`cursor-pointer p-1 rounded-full ${
                                    lead.followUpDate || lead.followUpTime
                                      ? "text-green-600 bg-green-100"
                                      : "text-gray-700 bg-gray-100"
                                  } hover:bg-gray-200 transition`}
                                  onClick={() => handleFollowUpClick(lead.id!)}
                                  title="Schedule Follow-up"
                                >
                                  <FaBell className="text-lg" />
                                </div>
                              </div>

                              {followUpLeadId === lead.id && (
                                <div
                                  className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50"
                                  onClick={() => setFollowUpLeadId(null)}
                                >
                                  <div
                                    className="bg-white border border-gray-300 rounded-md p-6 shadow-lg w-80 relative"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => setFollowUpLeadId(null)}
                                      className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                                      aria-label="Close"
                                    >
                                      ✕
                                    </button>
                                    <div className="flex justify-center mb-4">
                                      <h3 className="text-lg font-semibold">
                                        Follow Up
                                      </h3>
                                    </div>
                                    <div className="mb-4">
                                      <label
                                        htmlFor="followUpDate"
                                        className="block text-sm font-medium text-gray-700"
                                      >
                                        Date
                                      </label>
                                      <input
                                        type="date"
                                        id="followUpDate"
                                        value={followUpDate}
                                        onChange={(e) =>
                                          setFollowUpDate(e.target.value)
                                        }
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                      />
                                    </div>
                                    <div className="mb-6">
                                      <label
                                        htmlFor="followUpTime"
                                        className="block text-sm font-medium text-gray-700"
                                      >
                                        Time
                                      </label>
                                      <input
                                        type="time"
                                        id="followUpTime"
                                        value={followUpTime}
                                        onChange={(e) =>
                                          setFollowUpTime(e.target.value)
                                        }
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleSchedule(lead.id!)}
                                      className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
                                      disabled={!followUpDate || !followUpTime}
                                    >
                                      Schedule
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No leads found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel */}
        <div
          className={`bg-white border-l border-gray-200 transition-all duration-300 ease-in-out overflow-hidden flex ${
            isSidePanelOpen ? "w-full md:w-4/6" : "w-0"
          }`}
        >
          {isSidePanelOpen && selectedLead && (
            <div className="flex flex-col w-full">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Lead Details</h2>
                <button
                  onClick={closeSidePanel}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Combined fields section */}
                  {Object.entries(selectedLead)
                    .filter(
                      ([key]) =>
                        ![
                          "id",
                          "commentsHistory",
                          "comments",
                          "customerComment",
                        ].includes(key)
                    )
                    .map(([key, value]) => {
                      if (key === "platform") {
                        const platformInfo = getPlatformInfo(
                          String(value) || ""
                        );
                        return (
                          <div
                            key={key}
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200"
                          >
                            <div className="flex items-start">
                              <span className="font-medium text-gray-700 flex-shrink-0 w-32">
                                {formatLabel(key)}:
                              </span>
                              <div className="flex items-center">
                                <div
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${platformInfo.color} font-bold mr-2`}
                                >
                                  {platformInfo.icon}
                                </div>
                                <span className="text-gray-900 font-medium">
                                  {String(value) || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <DetailCard
                            key={key}
                            label={formatLabel(key)}
                            value={String(formatValue(key, value))}
                            statusColor={
                              key === "lead_status"
                                ? getStatusColor(String(value))
                                : undefined
                            }
                          />
                        );
                      }
                    })}

                  {/* Parsed fields from comments */}
                  <DetailCard
                    label="Location"
                    value={
                      extractLocation(selectedLead.comments || "") || "N/A"
                    }
                  />
                  <DetailCard
                    label="Profession"
                    value={
                      parseComments(selectedLead.comments || "").find(
                        (item) => item.label === "Profession"
                      )?.value || "N/A"
                    }
                  />
                  <DetailCard
                    label="They are"
                    value={
                      parseComments(selectedLead.comments || "").find(
                        (item) => item.label === "They are"
                      )?.value || "N/A"
                    }
                  />
                  <DetailCard
                    label="Child's Age"
                    value={
                      parseComments(selectedLead.comments || "").find(
                        (item) => item.label === "Child's Age"
                      )?.value || "N/A"
                    }
                  />

                  {/* Lead Score with color */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200">
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 flex-shrink-0 w-32">
                        Lead Score:
                      </span>
                      <span
                        className={`${getScoreColor(
                          extractScore(selectedLead.comments || "")
                        )} font-medium flex-grow break-words`}
                      >
                        {extractScore(selectedLead.comments || "") ?? "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Editable Customer Comment */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200 md:col-span-2">
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 flex-shrink-0 w-32">
                        Customer Comment:
                      </span>
                      {isEditingCustomerComment ? (
                        <div className="flex-grow">
                          <textarea
                            value={customerComment}
                            onChange={(e) => setCustomerComment(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            placeholder="Add your comment here"
                          />
                          <div className="flex justify-end space-x-2 mt-2">
                            <button
                              onClick={() => {
                                setIsEditingCustomerComment(false);
                                setCustomerComment(
                                  String(selectedLead.customerComment || "")
                                );
                              }}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveCustomerComment}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-grow group relative">
                          <p className="text-gray-900 font-medium break-words">
                            {customerComment || "No comments yet"}
                          </p>
                          <button
                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-500 hover:text-blue-600"
                            onClick={() => setIsEditingCustomerComment(true)}
                            title="Edit comment"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
