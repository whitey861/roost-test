import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const data = await api.getJob(id);
      setJob(data);
    } catch (err) {
      console.error('Failed to load job:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this job?')) {
      try {
        await api.cancelJob(id);
        loadJob();
      } catch (err) {
        alert('Failed to cancel job: ' + err.message);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this job?')) {
      try {
        await api.deleteJob(id);
        navigate('/jobs');
      } catch (err) {
        alert('Failed to delete job: ' + err.message);
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!job) {
    return <div className="p-8">Job not found</div>;
  }

  const progress = job.total_bytes > 0 ? (job.completed_bytes / job.total_bytes) * 100 : 0;

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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">{job.name}</h1>
          <p className="text-slate-500">{job.description}</p>
        </div>
        <div className="flex gap-2">
          {(job.status === 'running' || job.status === 'queued') && (
            <Button variant="destructive" onClick={handleCancel}>Cancel</Button>
          )}
          {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          )}
          <Button variant="outline" onClick={() => navigate('/jobs')}>Back to Jobs</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(job.status)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.completed_files} / {job.total_files}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(job.completed_bytes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Encryption</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{job.encryption_type}</Badge>
          </CardContent>
        </Card>
      </div>

      {job.total_bytes > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-slate-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {progress.toFixed(1)}% complete
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-2xl font-semibold mb-4">Files</h2>
      <Card>
        <CardContent className="p-0">
          {job.files && job.files.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Filename</th>
                    <th className="text-left p-4 font-medium">Size</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {job.files.map((file) => (
                    <tr key={file.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-medium">{file.original_filename}</td>
                      <td className="p-4">{formatBytes(file.file_size_bytes)}</td>
                      <td className="p-4">
                        <Badge variant={file.upload_status === 'completed' ? 'success' : 'secondary'}>
                          {file.upload_status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">{file.upload_completed_at ? formatDate(file.upload_completed_at) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">No files yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
