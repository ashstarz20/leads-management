import React, { useEffect, useState } from "react";
import { Users, Check, Award, ChevronDown } from "lucide-react";
import KPICard from "../components/dashboard/KPICard";
import LeadsTable from "../components/dashboard/LeadsTable";
import { Lead, KPI } from "../types";
import { syncLeadsFromSheets, fetchLeadsFromFirestore } from "../services/api";
import { exportToCSV } from "../utils/exportCsv";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { db, fetchAllUsers } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import ReactSelect, { components } from "react-select";
import { SyncLoader } from "react-spinners";
import { StylesConfig, GroupBase } from "react-select";

const Dashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<
    Array<{
      phoneNumber: string;
      displayName: string;
    }>
  >([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSwitchLoading, setUserSwitchLoading] = useState(false);
  // Add viewingUserPhone to state
  const [viewingUserPhone, setViewingUserPhone] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user || !user.phoneNumber) {
          throw new Error("User not authenticated or phone number missing");
        }

        const sanitizedPhone = user.phoneNumber.replace(/[^\d]/g, "");
        setViewingUserPhone(sanitizedPhone);
        const userDocRef = doc(db, "crm_users", sanitizedPhone);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists() && docSnap.data().isAdmin) {
          setIsAdmin(true);
          setUsersLoading(true);
          try {
            const users = await fetchAllUsers();
            setAllUsers(users);
          } catch (err) {
            console.error("Failed to fetch users", err);
          } finally {
            setUsersLoading(false);
          }
        }

        const initial = await fetchLeadsFromFirestore();
        setLeads(initial);
        computeKPIs(initial);

        await syncLeadsFromSheets();

        const updated = await fetchLeadsFromFirestore();
        setLeads(updated);
        computeKPIs(updated);
      } catch (err: unknown) {
        console.error("Error loading leads:", err);
        if (axios.isAxiosError(err) && err.response?.status === 500) {
          setWarning("No leads available for your account");
        } else if (err instanceof Error) {
          setError("Failed to load leads: " + err.message);
        } else {
          setError("Failed to load leads due to an unknown error");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    computeKPIs(leads);
  }, [leads]);

  const computeKPIs = (list: Lead[]) => {
    const meetingDone = list.filter(
      (l) => l.lead_status === "Meeting Done"
    ).length;
    const dealDone = list.filter((l) => l.lead_status === "Deal Done").length;
    setKpis([
      {
        title: "Total Leads",
        value: list.length,
        icon: <Users size={24} />,
        color: "blue",
      },
      {
        title: "Meeting Done",
        value: meetingDone,
        icon: <Check size={24} />,
        color: "orange",
      },
      {
        title: "Deal Done",
        value: dealDone,
        icon: <Award size={24} />,
        color: "green",
      },
    ]);
  };

  const handleStatusUpdate = (leadId: string, newStatus: string) => {
    setLeads(
      leads.map((lead) =>
        lead.id === leadId ? { ...lead, lead_status: newStatus } : lead
      )
    );
  };

  const handleExportCSV = () => {
    exportToCSV(
      leads,
      `leads_export_${new Date().toISOString().split("T")[0]}`
    );
  };

  const handleUserChange = async (
    selectedOption: { value: string; label: string } | null
  ) => {
    if (selectedOption) {
      setUserSwitchLoading(true);
      try {
        const userPhone = selectedOption.value;
        setSelectedUser(userPhone);
        setViewingUserPhone(userPhone); // Update viewing user phone
        const userLeads = await fetchLeadsFromFirestore(userPhone);
        setLeads(userLeads);
        computeKPIs(userLeads);
      } catch (error) {
        console.error("Failed to switch user", error);
      } finally {
        setUserSwitchLoading(false);
      }
    } else {
      // Reset to current user if selection is cleared
      const auth = getAuth();
      const user = auth.currentUser;
      if (user?.phoneNumber) {
        const sanitizedPhone = user.phoneNumber.replace(/[^\d]/g, "");
        setViewingUserPhone(sanitizedPhone);
      }
    }
  };
  const UserDropdown = () => {
    type UserOption = {
      value: string;
      label: string;
    };

    const selectStyles: StylesConfig<
      UserOption,
      false,
      GroupBase<UserOption>
    > = {
      control: (provided) => ({
        ...provided,
        minWidth: "240px",
        borderRadius: "0.375rem",
        borderColor: "#e5e7eb",
        "&:hover": { borderColor: "#93c5fd" },
        boxShadow: "none",
        backgroundColor: "#f9fafb",
        minHeight: "42px",
      }),
      option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? "#3b82f6"
          : state.isFocused
          ? "#dbeafe"
          : "white",
        color: state.isSelected ? "white" : "#1f2937",
        padding: "10px 15px",
        fontSize: "0.875rem",
      }),
      input: (provided) => ({
        ...provided,
        "input:focus": { boxShadow: "none" },
        fontSize: "0.875rem",
      }),
      placeholder: (provided) => ({
        ...provided,
        color: "#9ca3af",
        fontSize: "0.875rem",
      }),
      singleValue: (provided) => ({
        ...provided,
        color: "#1f2937",
        fontSize: "0.875rem",
        fontWeight: 500,
      }),
      menu: (provided) => ({
        ...provided,
        borderRadius: "0.375rem",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        zIndex: 10,
      }),
      indicatorSeparator: () => ({ display: "none" }),
    };

    return (
      <div className="relative w-64">
        <ReactSelect
          options={allUsers.map((user) => ({
            value: user.phoneNumber,
            label: user.displayName || user.phoneNumber,
          }))}
          value={
            selectedUser
              ? {
                  value: selectedUser,
                  label:
                    allUsers.find((u) => u.phoneNumber === selectedUser)
                      ?.displayName || selectedUser,
                }
              : null
          }
          onChange={handleUserChange}
          placeholder={usersLoading ? "Loading users..." : "Select user..."}
          isSearchable
          isLoading={usersLoading}
          loadingMessage={() => "Loading users..."}
          noOptionsMessage={({ inputValue }: { inputValue: string }) =>
            inputValue ? "No matching users" : "No users available"
          }
          components={{
            DropdownIndicator: (props) => (
              <components.DropdownIndicator {...props}>
                {usersLoading ? (
                  <div className="px-2">
                    <SyncLoader size={8} color="#3b82f6" />
                  </div>
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </components.DropdownIndicator>
            ),
            LoadingIndicator: () => (
              <div className="px-2">
                <SyncLoader size={8} color="#3b82f6" />
              </div>
            ),
          }}
          styles={selectStyles}
        />
        {userSwitchLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-md border border-gray-200">
            <SyncLoader size={8} color="#3b82f6" />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <SyncLoader size={12} color="#3b82f6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 rounded border-yellow-400 bg-yellow-50 px-4 py-3 flex items-start">
        <svg
          className="h-5 w-5 flex-shrink-0 text-yellow-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.366-.756 1.4-.756 1.766 0l6.518 13.452A.75.75 0 0115.75 18h-11.5a.75.75 0 01-.791-1.449l6.518-13.452zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-4a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 0110 10z"
            clipRule="evenodd"
          />
        </svg>
        <div className="ml-3 text-yellow-800">
          <p className="font-medium">Warning</p>
          <p className="mt-1 text-sm">⚠️ {warning}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-1 py-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
          />
        ))}
      </div>

      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"> */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Recent Leads</h2>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} records found
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          {isAdmin && <UserDropdown />}
          <button
            onClick={handleExportCSV}
            disabled={userSwitchLoading}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
              userSwitchLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {userSwitchLoading ? (
              <SyncLoader size={6} color="#ffffff" />
            ) : (
              "Export to CSV"
            )}
          </button>
        </div>
      </div>

      <LeadsTable
        leads={leads}
        onStatusUpdate={handleStatusUpdate}
        isLoading={userSwitchLoading}
        viewingUserPhone={viewingUserPhone}
      />
      {/* </div> */}
    </div>
  );
};

export default Dashboard;
