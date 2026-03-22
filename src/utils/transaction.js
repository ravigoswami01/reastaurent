export const abortTransaction = async (session) => {
  if (session?.inTransaction()) {
    await session.abortTransaction();
  }
  session.endSession();
};
