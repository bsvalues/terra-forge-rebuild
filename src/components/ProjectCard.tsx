
import { Calendar, MapPin, Users, DollarSign, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  id: string;
  name: string;
  location: string;
  status: "active" | "planning" | "completed" | "delayed";
  progress: number;
  budget: string;
  timeline: string;
  team: number;
  dueDate: string;
}

const ProjectCard = ({ 
  name, 
  location, 
  status, 
  progress, 
  budget, 
  timeline, 
  team, 
  dueDate 
}: ProjectCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-stone-100 text-stone-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-stone-100 text-stone-800";
    }
  };

  const getProgressColor = () => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 70) return "bg-orange-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg text-stone-900">{name}</h3>
            <div className="flex items-center text-stone-600 text-sm mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {location}
            </div>
          </div>
          <Badge className={getStatusColor()}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-stone-700">Progress</span>
            <span className="text-sm font-bold text-stone-900">{progress}%</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-stone-600">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>{budget}</span>
          </div>
          <div className="flex items-center text-stone-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>{timeline}</span>
          </div>
          <div className="flex items-center text-stone-600">
            <Users className="h-4 w-4 mr-2" />
            <span>{team} members</span>
          </div>
          <div className="flex items-center text-stone-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{dueDate}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className="w-full mt-4 terra-gradient hover:opacity-90 transition-opacity"
          variant="default"
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
