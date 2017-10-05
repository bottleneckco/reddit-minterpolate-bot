const os = require('os');
const fs = require('fs');
const path = require('path');
const async = require('async');
const Promise = require('bluebird');
const ffmpeg = require('fluent-ffmpeg');

const NUM_SEGMENTS = 5;

// Promisify FFMPEG
// See https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/710
const promisifyCommand = command => Promise.promisify(cb => command
  .on('end', () => { cb(null); })
  .on('error', (error) => { cb(error); })
  .run());

const ffprobe = Promise.promisify(ffmpeg.ffprobe);
const parallel = Promise.promisify(async.parallel);

/**
 * Main function to motion interpolate a video clip segment
 * @param {string} filePath path of input file
 * @param {number} startTime start time of segment
 * @param {number} endTime end time of segment
 * @returns {string} processed output file path
 */
const processSegment = async (filePath, startTime, endTime) => {
  console.log(`Processing segment of time ${startTime}-${endTime}`);
  const outputTempPath = path.join(os.tmpdir(), `${startTime}-${endTime}-${path.basename(filePath)}`);
  const command = ffmpeg(filePath)
    .videoFilter('minterpolate=\'fps=60\'')
    .setStartTime(startTime)
    .setDuration(endTime - startTime)
    .addInputOption('-threads 2')
    .output(outputTempPath);
  command.on('progress', ({ currentFps, percent }) => process.stdout.write(`Segment ${startTime}-${endTime} FPS: ${currentFps} %: ${percent}\r`));
  await promisifyCommand(command)();
  console.log(`Finished segment of time ${startTime}-${endTime}`);
  return outputTempPath;
};

const generateTasks = (filePath, maxDuration) => {
  const segmentLength = maxDuration / NUM_SEGMENTS;
  const tasks = Array(NUM_SEGMENTS)
    .fill(0)
    .map((value, index) => segmentLength * index)
    .map(startTime => async () => processSegment(
      filePath,
      startTime,
      startTime + segmentLength,
    ));
  return tasks.map(async.asyncify);
};

module.exports = async (sourceFile) => {
  const sourceFilePath = path.resolve(sourceFile);
  const { format: { duration } } = await ffprobe(sourceFilePath);

  const results = await parallel(generateTasks(sourceFilePath, duration));
  console.log(results);
};
