import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function FileBrowser() {
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [pagination.page, filters]);

  const loadFiles = async () => {
    try {
      const data = await api.getFiles({ ...filters, page: pagination.page, limit: pagination.limit });
      setFiles(data.files);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEncryptionBadge = (encryptionType, isEncrypted) => {
    if (!isEncrypted) return <Badge variant="outline">None</Badge>;

    const labels = {
      aes256_local: 'AES-256 Local',
      aes256_escrow: 'AES-256 Escrow'
    };

    return <Badge variant="secondary">{labels[encryptionType] || encryptionType}</Badge>;
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">File Browser</h1>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Input
              placeholder="Search files..."
              className="max-w-sm"
            />
            <select
              className="border rounded-md px-3 py-2"
              onChange={(e) => setFilters({ ...filters, encryption_type: e.target.value || undefined })}
            >
              <option value="">All Encryption Types</option>
              <option value="none">No Encryption</option>
              <option value="aes256_local">AES-256 Local</option>
              <option value="aes256_escrow">AES-256 Escrow</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {files.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>No files have been backed up yet.</p>
              <p className="mt-2 text-sm">Start a new backup job to upload your files.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="text-left p-4 font-medium">Filename</th>
                      <th className="text-left p-4 font-medium">Original Path</th>
                      <th className="text-left p-4 font-medium">Size</th>
                      <th className="text-left p-4 font-medium">Job</th>
                      <th className="text-left p-4 font-medium">Encryption</th>
                      <th className="text-left p-4 font-medium">Backup Date</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.id} className="border-b hover:bg-slate-50">
                        <td className="p-4 font-medium">{file.original_filename}</td>
                        <td className="p-4 text-sm text-slate-600">{file.original_path}</td>
                        <td className="p-4">{formatBytes(file.file_size_bytes)}</td>
                        <td className="p-4 text-sm">{file.job_name}</td>
                        <td className="p-4">{getEncryptionBadge(file.encryption_type, file.is_encrypted)}</td>
                        <td className="p-4 text-sm">{formatDate(file.upload_completed_at)}</td>
                        <td className="p-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/storage/download/${encodeURIComponent(file.stored_key)}`, '_blank')}
                          >
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} files)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
