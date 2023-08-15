export type JobReturn = {
  msg?: string;
  data?: unknown;
} | undefined;

export const scheduler = async (getJob: Generator<{
  key: string | number;
  job: Promise<JobReturn>;
}>, n: number) => new Promise((resolve) => {
  // job queue
  const queue = new Array<Promise<JobReturn>>(n);
  // working job queue counts
  let workingQueue = n;
  // total job count
  let totalJobs = 0;
  // failed job keys
  const failedJobs: Array<{ key: number | string; reason?: unknown }> = [];
  const jobResults: Record<string, unknown> = {};

  const setJob = (index: number) => {
    const jobItem = getJob.next();
    if(jobItem.done) {
      workingQueue--;
    } else {
      totalJobs++;
      queue[index] = jobItem.value.job;
      queue[index].then((res) => {
        jobResults[jobItem.value.key] = res?.data;
        console.log(`queue: ${index}, job: ${res?.msg ?? jobItem.value.key} was done`);
      }).catch(e => {
        failedJobs.push({key: jobItem.value.key, reason: e});
        console.log(`queue: ${index}, job: ${jobItem.value.key} was failed`);
      }).finally(() => setJob(index));
    }

    // all jobs were down
    if(!workingQueue) {
      resolve({
        concurrency: n,
        totalJobs,
        failedJobs,
      });
    }
  };

  // first job
  for(let i = 0; i < n; i++) {
    setJob(i);
  }
})