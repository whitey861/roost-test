import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { ENCRYPTION_OPTIONS, generateEncryptionKey, encryptChunk, calculateChecksum } from '@/lib/encryption';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

export function NewJobWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [jobData, setJobData] = useState({
    name: '',
    description: '',
    encryption_type: 'none',
    encryption_password: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const startUpload = async () => {
    setUploading(true);

    try {
      // Create job
      let encryptionKey = null;
      let encryptedKeyBlob = null;

      if (jobData.encryption_type !== 'none' && jobData.encryption_password) {
        const keyData = await generateEncryptionKey(jobData.encryption_password);
        encryptionKey = keyData.key;

        if (jobData.encryption_type === 'aes256_escrow') {
          encryptedKeyBlob = JSON.stringify(keyData.keyBytes);
        }
      }

      const job = await api.createJob({
        name: jobData.name,
        description: jobData.description,
        encryption_type: jobData.encryption_type,
        encrypted_key_blob: encryptedKeyBlob,
        total_files: selectedFiles.length,
        total_bytes: selectedFiles.reduce((sum, f) => sum + f.size, 0)
      });

      // Upload each file
      for (const file of selectedFiles) {
        await uploadFile(file, job.id, encryptionKey);
      }

      navigate(`/jobs/${job.id}`);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file, jobId, encryptionKey) => {
    try {
      const checksum = await calculateChecksum(file);

      const session = await api.initUpload({
        job_id: jobId,
        filename: file.name,
        original_path: file.webkitRelativePath || file.name,
        file_size: file.size,
        checksum_sha256: checksum,
        encryption_type: jobData.encryption_type
      });

      const sessionId = session.upload_session_id;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      setUploadProgress(prev => ({
        ...prev,
        [file.name]: { current: 0, total: totalChunks }
      }));

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        let chunkData = await chunk.arrayBuffer();

        // Encrypt if needed
        if (encryptionKey) {
          chunkData = await encryptChunk(chunkData, encryptionKey);
        }

        await api.uploadChunk(sessionId, i, chunkData);

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { current: i + 1, total: totalChunks }
        }));
      }

      // Complete upload
      await api.completeUpload(sessionId);

      // Transfer to storage
      await api.transferToStorage(sessionId);

    } catch (err) {
      console.error(`Failed to upload ${file.name}:`, err);
      throw err;
    }
  };

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Job Details</CardTitle>
        <CardDescription>Give your backup job a name and description</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Job Name</Label>
          <Input
            id="name"
            value={jobData.name}
            onChange={(e) => setJobData({ ...jobData, name: e.target.value })}
            placeholder="My Backup Job"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={jobData.description}
            onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
            placeholder="Describe what you're backing up"
          />
        </div>
        <Button onClick={() => setStep(2)} disabled={!jobData.name}>
          Next
        </Button>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Encryption Options</CardTitle>
        <CardDescription>Choose how your files should be encrypted</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(ENCRYPTION_OPTIONS).map((option) => (
          <div key={option.value} className="border rounded-lg p-4">
            <label className="flex items-start cursor-pointer">
              <input
                type="radio"
                name="encryption"
                value={option.value}
                checked={jobData.encryption_type === option.value}
                onChange={(e) => setJobData({ ...jobData, encryption_type: e.target.value })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium mb-1">{option.label}</div>
                <div className="text-sm text-slate-600">{option.description}</div>
              </div>
            </label>
          </div>
        ))}

        {jobData.encryption_type !== 'none' && (
          <div>
            <Label htmlFor="password">Encryption Password</Label>
            <Input
              id="password"
              type="password"
              value={jobData.encryption_password}
              onChange={(e) => setJobData({ ...jobData, encryption_password: e.target.value })}
              placeholder="Enter a strong password"
              required
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep(1)}>
            Back
          </Button>
          <Button onClick={() => setStep(3)} disabled={jobData.encryption_type !== 'none' && !jobData.encryption_password}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => {
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Files</CardTitle>
          <CardDescription>Choose files or a folder to back up</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="files">Select Files</Label>
            <Input
              id="files"
              type="file"
              multiple
              onChange={handleFileSelect}
            />
          </div>

          <div>
            <Label htmlFor="folder">Or Select Folder</Label>
            <Input
              id="folder"
              type="file"
              webkitdirectory=""
              directory=""
              onChange={handleFileSelect}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="font-medium mb-2">
                Selected: {selectedFiles.length} files ({formatBytes(totalSize)})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="text-sm flex justify-between">
                    <span>{file.name}</span>
                    <span className="text-slate-500">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="font-medium">Upload Progress</div>
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span>{filename}</span>
                    <span>{progress.current} / {progress.total} chunks</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} disabled={uploading}>
              Back
            </Button>
            <Button onClick={startUpload} disabled={selectedFiles.length === 0 || uploading}>
              {uploading ? 'Uploading...' : 'Start Backup'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">New Backup Job</h1>

      <div className="mb-8 flex items-center justify-center">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s <= step ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
              {s}
            </div>
            {s < 3 && <div className={`w-24 h-1 ${s < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}
