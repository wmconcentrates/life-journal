// Video Generation Utility
// Uses FFmpeg to create recap videos from photos
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, unlink, access } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, '../../videos');

// Ensure output directory exists
const ensureOutputDir = async () => {
    try {
        await access(OUTPUT_DIR);
    } catch {
        await mkdir(OUTPUT_DIR, { recursive: true });
    }
};

// Check if FFmpeg is available
export const checkFFmpeg = async () => {
    try {
        await execAsync('ffmpeg -version');
        return true;
    } catch {
        console.warn('[VideoGenerator] FFmpeg not found. Video generation will be simulated.');
        return false;
    }
};

// Generate video from photos
export const generateVideo = async (photos, options = {}) => {
    console.log(`[VideoGenerator] Generating video from ${photos.length} photos`);

    const {
        outputFilename = `recap_${Date.now()}.mp4`,
        duration = 3, // seconds per photo
        transition = 'crossfade',
        music = null,
        resolution = '1080p'
    } = options;

    await ensureOutputDir();
    const outputPath = join(OUTPUT_DIR, outputFilename);

    // Check for FFmpeg
    const hasFFmpeg = await checkFFmpeg();

    if (!hasFFmpeg || photos.length === 0) {
        // Return simulated result
        console.log('[VideoGenerator] Simulating video generation');
        return {
            success: true,
            simulated: true,
            path: outputPath,
            url: `/videos/${outputFilename}`,
            duration: photos.length * duration,
            photoCount: photos.length
        };
    }

    try {
        // Generate FFmpeg command
        const ffmpegCmd = buildFFmpegCommand(photos, outputPath, {
            duration,
            transition,
            music,
            resolution
        });

        console.log('[VideoGenerator] Running FFmpeg...');
        await execAsync(ffmpegCmd);

        console.log('[VideoGenerator] Video generated successfully');
        return {
            success: true,
            simulated: false,
            path: outputPath,
            url: `/videos/${outputFilename}`,
            duration: photos.length * duration,
            photoCount: photos.length
        };
    } catch (error) {
        console.error('[VideoGenerator] FFmpeg error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

// Build FFmpeg command for slideshow
const buildFFmpegCommand = (photos, outputPath, options) => {
    const { duration, transition, resolution } = options;

    // Resolution mapping
    const resolutions = {
        '720p': '1280:720',
        '1080p': '1920:1080',
        '4k': '3840:2160'
    };
    const size = resolutions[resolution] || resolutions['1080p'];

    // Create input files list
    const inputs = photos.map((p, i) => `-loop 1 -t ${duration} -i "${p.path || p}"`).join(' ');

    // Create filter for crossfade transitions
    let filter = '';
    if (photos.length > 1 && transition === 'crossfade') {
        const transitionDuration = 0.5;
        filter = photos.map((_, i) => {
            if (i === 0) return `[${i}:v]scale=${size}:force_original_aspect_ratio=decrease,pad=${size}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`;
            return `[${i}:v]scale=${size}:force_original_aspect_ratio=decrease,pad=${size}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`;
        }).join(';');

        // Add crossfade between clips
        let lastOutput = '[v0]';
        for (let i = 1; i < photos.length; i++) {
            const offset = (i * duration) - transitionDuration;
            const nextOutput = i === photos.length - 1 ? '[outv]' : `[cf${i}]`;
            filter += `;${lastOutput}[v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}${nextOutput}`;
            lastOutput = nextOutput;
        }
    } else {
        // Simple concat without transitions
        filter = photos.map((_, i) =>
            `[${i}:v]scale=${size}:force_original_aspect_ratio=decrease,pad=${size}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
        ).join(';');
        filter += ';' + photos.map((_, i) => `[v${i}]`).join('') + `concat=n=${photos.length}:v=1:a=0[outv]`;
    }

    return `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
};

// Generate weekly recap video
export const generateWeeklyRecap = async (userId, weekPhotos, analysisData) => {
    console.log(`[VideoGenerator] Creating weekly recap for user ${userId}`);

    const outputFilename = `recap_${userId}_week_${Date.now()}.mp4`;

    // Sort photos by suggested pacing
    const sortedPhotos = weekPhotos.sort((a, b) => {
        const aAnalysis = analysisData.photos.find(p => p.filename === a.filename);
        const bAnalysis = analysisData.photos.find(p => p.filename === b.filename);
        return (bAnalysis?.quality_score || 5) - (aAnalysis?.quality_score || 5);
    });

    // Use hero shots first, then fill with other photos
    const heroFilenames = analysisData.heroShots.map(h => h.filename);
    const heroPhotos = sortedPhotos.filter(p => heroFilenames.includes(p.filename));
    const otherPhotos = sortedPhotos.filter(p => !heroFilenames.includes(p.filename)).slice(0, 10);

    const finalPhotos = [...heroPhotos, ...otherPhotos].slice(0, 15);

    const result = await generateVideo(finalPhotos, {
        outputFilename,
        duration: 3,
        transition: 'crossfade',
        resolution: '1080p'
    });

    return result;
};

// Clean up old videos (older than 7 days)
export const cleanupOldVideos = async () => {
    // This would delete videos older than 7 days
    console.log('[VideoGenerator] Cleanup would run here');
    return { cleaned: 0 };
};
