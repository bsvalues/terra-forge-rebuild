
import { Building, Hammer, TrendingUp, Users } from "lucide-react";
import StatsCard from "./StatsCard";
import ProjectCard from "./ProjectCard";

const ProjectDashboard = () => {
  const statsData = [
    {
      title: "Active Projects",
      value: "12",
      change: "+2 this month",
      changeType: "increase" as const,
      icon: Building,
    },
    {
      title: "Total Budget",
      value: "$2.4M",
      change: "+15% from last quarter",
      changeType: "increase" as const,
      icon: TrendingUp,
    },
    {
      title: "Team Members",
      value: "48",
      change: "+8 new hires",
      changeType: "increase" as const,
      icon: Users,
    },
    {
      title: "Equipment",
      value: "156",
      change: "98% operational",
      changeType: "neutral" as const,
      icon: Hammer,
    },
  ];

  const projectsData = [
    {
      id: "1",
      name: "Downtown Office Complex",
      location: "San Francisco, CA",
      status: "active" as const,
      progress: 75,
      budget: "$850K",
      timeline: "8 months",
      team: 12,
      dueDate: "Dec 2024",
    },
    {
      id: "2",
      name: "Riverside Residential",
      location: "Austin, TX",
      status: "active" as const,
      progress: 45,
      budget: "$420K",
      timeline: "6 months",
      team: 8,
      dueDate: "Feb 2025",
    },
    {
      id: "3",
      name: "Industrial Warehouse",
      location: "Phoenix, AZ",
      status: "planning" as const,
      progress: 15,
      budget: "$680K",
      timeline: "10 months",
      team: 6,
      dueDate: "Mar 2025",
    },
    {
      id: "4",
      name: "Highway Bridge Repair",
      location: "Denver, CO",
      status: "delayed" as const,
      progress: 30,
      budget: "$1.2M",
      timeline: "12 months",
      team: 15,
      dueDate: "Jun 2025",
    },
    {
      id: "5",
      name: "Shopping Center Renovation",
      location: "Miami, FL",
      status: "active" as const,
      progress: 90,
      budget: "$320K",
      timeline: "4 months",
      team: 10,
      dueDate: "Jan 2025",
    },
    {
      id: "6",
      name: "School Campus Extension",
      location: "Seattle, WA",
      status: "completed" as const,
      progress: 100,
      budget: "$950K",
      timeline: "9 months",
      team: 18,
      dueDate: "Completed",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div>
        <h2 className="text-2xl font-bold text-stone-900 mb-6">Project Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Current Projects</h2>
          <div className="flex space-x-4">
            <select className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
              <option>All Status</option>
              <option>Active</option>
              <option>Planning</option>
              <option>Completed</option>
              <option>Delayed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projectsData.map((project) => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
