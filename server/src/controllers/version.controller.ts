import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Version } from '../models/Version';
import { Room } from '../models/Room';

/**
 * POST /api/versions/:roomId
 * Create a named snapshot of the current canvas.
 */
export async function createVersion(req: AuthRequest, res: Response): Promise<void> {
  const { roomId } = req.params;
  const { label, canvasData } = req.body;

  // Atomically determine next version number
  const latest = await Version.findOne({ room: roomId }).sort({ versionNumber: -1 }).lean();
  const nextNum = (latest?.versionNumber ?? 0) + 1;

  const version = await Version.create({
    room: roomId,
    createdBy: req.user!.id,
    canvasData,
    label: label || `Version ${nextNum}`,
    versionNumber: nextNum,
  });

  res.status(201).json(version);
}

/**
 * GET /api/versions/:roomId
 * List all versions for a room (metadata only, no canvasData).
 */
export async function listVersions(req: AuthRequest, res: Response): Promise<void> {
  const versions = await Version.find({ room: req.params.roomId })
    .select('-canvasData')
    .populate('createdBy', 'name avatar')
    .sort({ versionNumber: -1 });

  res.json(versions);
}

/**
 * GET /api/versions/:roomId/:versionId
 * Get the full canvas snapshot for a specific version.
 */
export async function getVersion(req: AuthRequest, res: Response): Promise<void> {
  const version = await Version.findOne({
    _id: req.params.versionId,
    room: req.params.roomId,
  }).populate('createdBy', 'name avatar');

  if (!version) {
    res.status(404).json({ message: 'Version not found' });
    return;
  }
  res.json(version);
}

/**
 * POST /api/versions/:roomId/:versionId/restore
 * Restore a past version as the room's live canvas.
 */
export async function restoreVersion(req: AuthRequest, res: Response): Promise<void> {
  const version = await Version.findOne({
    _id: req.params.versionId,
    room: req.params.roomId,
  });

  if (!version) {
    res.status(404).json({ message: 'Version not found' });
    return;
  }

  await Room.findByIdAndUpdate(req.params.roomId, { canvasData: version.canvasData });

  // Create a new version entry marking the restoration
  const latest = await Version.findOne({ room: req.params.roomId }).sort({ versionNumber: -1 }).lean();
  const nextNum = (latest?.versionNumber ?? 0) + 1;

  await Version.create({
    room: req.params.roomId,
    createdBy: req.user!.id,
    canvasData: version.canvasData,
    label: `Restored from v${version.versionNumber}`,
    versionNumber: nextNum,
  });

  res.json({ message: 'Version restored', canvasData: version.canvasData });
}
