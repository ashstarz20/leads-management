import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Lead } from "../../types";
import { Phone, ExternalLink } from "lucide-react";
import { updateLeadStatus } from "../../services/api";

interface LeadsTableProps {
  leads: Lead[];
  onStatusUpdate: (index: string, newStatus: string) => void;
}

const LeadsTable: React.FC<LeadsTableProps> = ({ leads, onStatusUpdate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // **NEW**: track which lead is currently selected for detail view
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  // **NEW**: parse comments into a map of label→value
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
      // trim any leading “:” or whitespace
      const value = txt.replace(/^[:\s]+/, "");
      return { label: labels[i] || `Field ${i + 1}`, value };
    });
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      onStatusUpdate(leadId, newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Filter leads based on search term and filters
  const filteredLeads = leads.filter((lead) => {
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

  // Sort leads by created_time in descending order
  filteredLeads.sort(
    (a, b) =>
      new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
  );

  // Get unique statuses for filter dropdown
  const statuses = Array.from(
    new Set(leads.map((lead) => lead.lead_status))
  ).filter(Boolean);

  // Get unique platforms for filter dropdown
  const platforms = Array.from(
    new Set(leads.map((lead) => lead.platform))
  ).filter(Boolean);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy hh:mm a");
      // Example output: May 23, 2025 04:30 PM
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Contact
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
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Date
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
            {paginatedLeads.length > 0 ? (
              paginatedLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  {/* <td className="px-6 py-4 whitespace-nowrap flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {lead.name}
                    </span>
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => setDetailLead(lead)}
                        className="p-1 hover:bg-gray-100 rounded-full focus:outline-none"
                        title="Actions"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                  </td> */}
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    onClick={() => setDetailLead(lead)}
                  >
                    {lead.name}
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
                    <div className="text-sm text-gray-500 uppercase">
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
                      {/* External view link */}
                      <a
                        href={`https://web.whatsapp.com/send?phone=${lead.whatsapp_number_}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900"
                        title="Open WhatsApp"
                      >
                        <ExternalLink size={16} />
                      </a>

                      {/* Status dropdown */}
                      <select
                        value={lead.lead_status}
                        onChange={(e) =>
                          handleStatusChange(lead.id!, e.target.value)
                        }
                        className="bg-gray-100 border border-gray-300 text-gray-800 text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="New">New</option>
                        <option value="Meeting Done">Meeting Done</option>
                        <option value="Deal Done">Deal Done</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No leads found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* —————— Detail Modal —————— */}
      {detailLead && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setDetailLead(null)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Lead Details</h2>
            <div className="space-y-2">
              {parseComments(detailLead.comments).map(({ label, value }) => (
                <div key={label} className="flex">
                  <span className="font-medium w-40">{label}:</span>
                  <span className="flex-1">{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDetailLead(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Simplified Pagination */}
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
                {Math.min(currentPage * itemsPerPage, filteredLeads.length)}
              </span>{" "}
              of <span className="font-medium">{filteredLeads.length}</span>{" "}
              leads
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
// Dropdown state for status change actions (optional, for future dropdown UI)
// (Removed unused openDropdown state)
