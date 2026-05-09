import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function JobsList() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await api.getJobs();
      setJobs(data);
    } catch (err) {
      console.error('Failed to load jobs:', err);
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
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">All Jobs</h1>
        <Button onClick={() => navigate('/jobs/new')}>New Backup Job</Button>
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
                    <th className="text-left p-4 font-medium">Encryption</th>
                    <th className="text-left p-4 font-medium">Created</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-medium">{job.name}</td>
                      <td className="p-4">{getStatusBadge(job.status)}</td>
                      <td className="p-4">{job.completed_files} / {job.total_files}</td>
                      <td className="p-4">{formatBytes(job.completed_bytes)}</td>
                      <td className="p-4"><Badge variant="outline">{job.encryption_type}</Badge></td>
                      <td className="p-4 text-sm">{formatDate(job.created_at)}</td>
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
    </div>
  );
}
