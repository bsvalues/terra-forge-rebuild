
import Header from "@/components/Header";
import ProjectDashboard from "@/components/ProjectDashboard";

const Index = () => {
  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            Good morning, Project Manager
          </h1>
          <p className="text-stone-600">
            Here's what's happening with your construction projects today.
          </p>
        </div>
        <ProjectDashboard />
      </main>
    </div>
  );
};

export default Index;
