import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total: 0, running: 0, completed: 0, failed: 0, totalBytes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const jobsData = await api.getJobs();
      setJobs(jobsData);

      // Calculate stats
      const total = jobsData.length;
      const running = jobsData.filter(j => j.status === 'running' || j.status === 'queued').length;
      const completed = jobsData.filter(j => j.status === 'completed').length;
      const failed = jobsData.filter(j => j.status === 'failed').length;
      const totalBytes = jobsData.reduce((sum, j) => sum + (j.completed_bytes || 0), 0);

      setStats({ total, running, completed, failed, totalBytes });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      queued: 'secondary',
      running: 'default',
      completed: 'success',
      failed: 'destructive',
      cancelled: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-slate-500">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">{stats.running}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Storage Used</CardDescription>
            <CardTitle className="text-2xl">{formatBytes(stats.totalBytes)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Recent Jobs</h2>
        <Button onClick={() => navigate('/jobs/new')}>Start New Backup</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="mb-4">No backup jobs yet</p>
              <Button onClick={() => navigate('/jobs/new')}>Create Your First Backup</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Files</th>
                    <th className="text-left p-4 font-medium">Size</th>
                    <th className="text-left p-4 font-medium">Created</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.slice(0, 5).map((job) => (
                    <tr key={job.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-medium">{job.name}</td>
                      <td className="p-4">{getStatusBadge(job.status)}</td>
                      <td className="p-4">{job.completed_files} / {job.total_files}</td>
                      <td className="p-4">{formatBytes(job.completed_bytes)}</td>
                      <td className="p-4">{new Date(job.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/jobs/${job.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {jobs.length > 5 && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => navigate('/jobs')}>
            View All Jobs
          </Button>
        </div>
      )}
    </div>
  );
}
