import { Link } from 'react-router-dom';
import Card, { CardHeader, CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';

function ProjectCard({ 
  project, 
  isAdmin = false, 
  onDeleteProject,
  onUpdateProgress,
  showProgressControls = false
}) {
  const getProgressColor = (progress) => {
    if (progress < 30) return 'bg-danger';
    if (progress < 70) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="bg-gray-50">
        <h3 className="text-xl font-bold text-gray-800">{project.title}</h3>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-semibold">Description:</span> {project.description}
        </p>
        
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-semibold">Category:</span> {project.category}
        </p>
        
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-semibold">Students:</span> {project.students}
        </p>
        
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-semibold">Status:</span>{' '}
          <span 
            className={`px-2 py-1 rounded text-xs ${
              project.status === 'Completed' ? 'bg-success text-white' :
              project.status === 'In Progress' ? 'bg-warning' :
              project.status === 'Pending' ? 'bg-gray-200' :
              'bg-gray-200'
            }`}
          >
            {project.status}
          </span>
        </p>
        
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-semibold text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-gray-700">{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${getProgressColor(project.progress)}`}
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>
        
        {showProgressControls && (
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-700 block mb-1">
              Update Progress:
            </label>
            <div className="flex items-center">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={project.progress} 
                onChange={(e) => onUpdateProgress(project.id, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="ml-2 text-sm font-semibold">{project.progress}%</span>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="bg-gray-50 flex justify-between items-center">
        <div className="flex space-x-2 text-xs text-gray-500">
          <span>{project.startDate}</span>
          <span>→</span>
          <span>{project.endDate}</span>
        </div>
        
        {isAdmin && (
          <div className="flex space-x-2">
            <Link to={`/admin/projects/edit/${project.id}`}>
              <Button variant="primary" size="sm">Edit</Button>
            </Link>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => onDeleteProject(project.id)}
            >
              Delete
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default ProjectCard; 