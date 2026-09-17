import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { mediaBlob } from '../services/api.service';
import type { IJob } from '../interfaces';
import { Spinner } from './Spinner';
import { ErrorBox } from './ErrorBox';

export function Media({
  job,
  download = false,
}: {
  job?: IJob;
  download?: boolean;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';
    setUrl('');
    setError('');

    if (job?.url) {
      void mediaBlob(job.url)
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          if (!disposed) setUrl(objectUrl);
          else URL.revokeObjectURL(objectUrl);
        })
        .catch((e) => {
          if (!disposed) setError((e as Error).message);
        });
    }

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [job?.url, job?.attempts]);

  if (!job?.url) return null;
  if (error) return <ErrorBox message={error} />;
  if (!url) return <Spinner />;

  if (download) {
    return (
      <a
        className="button primary"
        href={url}
        download={`projectx-${job.id}.${job.kind === 'voice' ? 'wav' : job.kind === 'image' ? 'png' : 'mp4'}`}
      >
        <Download size={16} /> Tải xuống
      </a>
    );
  }

  if (job.kind === 'voice') {
    return <audio controls preload="metadata" src={url} />;
  }

  if (job.kind === 'image') {
    return (
      <img
        className="media-image"
        src={url}
        alt={`Ảnh cảnh ${job.sceneIndex}`}
      />
    );
  }

  return (
    <video controls preload="metadata" src={url} className="media-video" />
  );
}
