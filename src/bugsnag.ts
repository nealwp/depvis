function info(err: Error) {
  console.log(err);
}

function warn(err: Error) {
  console.warn(err);
}

function error(err: Error) {
  console.error(err);
}

export const report = { info, warn, error };
