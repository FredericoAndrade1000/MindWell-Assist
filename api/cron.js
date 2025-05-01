import cron from 'node-cron';
import { Assessment, sequelize } from './db.js'; // Import necessary model and sequelize instance
import { Op } from 'sequelize';
import fs from 'fs'; // Import fs for logging
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE_PATH = path.join(__dirname, 'app.log'); // Central log file

// --- Logging Helper ---
const logToFile = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    try {
        fs.appendFileSync(LOG_FILE_PATH, logMessage);
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
};


// --- Cron Job Definitions ---

/**
 * Anonymizes old assessment records based on retention policy (e.g., 12 months).
 * Sets userId and answers to NULL.
 * @param {boolean} manualTrigger - Indicates if the job was triggered manually (for logging purposes).
 */
const anonymizeOldAssessments = async (manualTrigger = false) => {
    const triggerType = manualTrigger ? 'Manual' : 'Scheduled';
    logToFile(`[Cron - ${triggerType}] Starting anonymization task...`);
    const retentionMonths = 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    try {
        const [affectedCount] = await Assessment.update(
            {
                userId: null,
                answers: null, // Nullify encrypted answers
                // Optionally add an 'anonymizedAt' timestamp field
                // anonymizedAt: new Date()
            },
            {
                where: {
                    createdAt: {
                        [Op.lt]: cutoffDate, // Less than the cutoff date
                    },
                    [Op.or]: [ // Only update if not already anonymized
                        { userId: { [Op.ne]: null } },
                        { answers: { [Op.ne]: null } }
                    ]
                    // If using anonymizedAt field:
                    // anonymizedAt: { [Op.is]: null }
                },
                // hooks: false // Potentially skip hooks if they interfere with nullifying
            }
        );

        if (affectedCount > 0) {
            logToFile(`[Cron - ${triggerType}] Successfully anonymized ${affectedCount} assessments older than ${cutoffDate.toISOString()}.`);
        } else {
             logToFile(`[Cron - ${triggerType}] No assessments required anonymization.`);
        }
    } catch (error) {
        logToFile(`[Cron - ${triggerType}] Error during assessment anonymization: ${error.message}\n${error.stack}`);
    }
};

/**
 * Calculates daily statistics (example: assessment counts per risk level).
 * In this simple setup, it just logs the counts. Could be extended to save to a DailyStats table.
 * @param {boolean} manualTrigger - Indicates if the job was triggered manually.
 */
const calculateDailyStats = async (manualTrigger = false) => {
     const triggerType = manualTrigger ? 'Manual' : 'Scheduled';
     logToFile(`[Cron - ${triggerType}] Starting daily stats calculation task...`);
     const todayStart = new Date();
     todayStart.setHours(0, 0, 0, 0);
     const todayEnd = new Date();
     todayEnd.setHours(23, 59, 59, 999);

     try {
         const stats = await Assessment.findAll({
             attributes: [
                 'riskLevel',
                 [sequelize.fn('COUNT', sequelize.col('id')), 'count']
             ],
             where: {
                 createdAt: {
                     [Op.between]: [todayStart, todayEnd],
                 },
             },
             group: ['riskLevel'],
             raw: true,
         });

         const counts = { LOW: 0, MODERATE: 0, HIGH: 0 };
         stats.forEach(stat => {
             counts[stat.riskLevel] = parseInt(stat.count, 10);
         });

         logToFile(`[Cron - ${triggerType}] Daily Stats (${todayStart.toISOString().split('T')[0]}): LOW=${counts.LOW}, MODERATE=${counts.MODERATE}, HIGH=${counts.HIGH}`);

         // TODO: Optionally save these stats to a 'DailyStats' table
         // await DailyStats.create({ date: todayStart, lowCount: counts.LOW, ... });

     } catch (error) {
          logToFile(`[Cron - ${triggerType}] Error calculating daily stats: ${error.message}\n${error.stack}`);
     }
};


// --- Job Scheduling ---
const scheduledJobs = [];

const startCronJobs = () => {
    logToFile("Initializing cron jobs...");

    // Schedule anonymization task (e.g., daily at 3:00 AM server time)
    // Cron format: second minute hour day-of-month month day-of-week
    const anonymizeJob = cron.schedule('0 3 * * *', () => anonymizeOldAssessments(false), {
        scheduled: true,
        timezone: "Etc/UTC" // Specify timezone, e.g., "America/New_York" or UTC
    });
    scheduledJobs.push(anonymizeJob);
    logToFile("Scheduled 'anonymizeOldAssessments' job for 03:00 UTC daily.");


    // Schedule daily stats calculation (e.g., daily at 00:05 AM server time)
     const statsJob = cron.schedule('5 0 * * *', () => calculateDailyStats(false), {
         scheduled: true,
         timezone: "Etc/UTC"
     });
     scheduledJobs.push(statsJob);
     logToFile("Scheduled 'calculateDailyStats' job for 00:05 UTC daily.");


    logToFile(`Started ${scheduledJobs.length} cron jobs.`);
};

const stopCronJobs = () => {
    logToFile("Stopping cron jobs...");
    scheduledJobs.forEach(job => job.stop());
    logToFile("All cron jobs stopped.");
};

// Export functions for potential manual triggering or testing
export { startCronJobs, stopCronJobs, anonymizeOldAssessments, calculateDailyStats };
