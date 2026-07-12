import Address from "../models/Address.js";

const MAX_ADDRESSES = 3;

export const addAddress = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔒 Count existing addresses
    const addressCount = await Address.countDocuments({ user: userId });

    if (addressCount >= MAX_ADDRESSES) {
      return res.status(400).json({
        success: false,
        message: `You can add maximum ${MAX_ADDRESSES} addresses only`,
      });
    }

    const address = await Address.create({
      user: userId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      data: address,
    });
  } catch (error) {
    console.error("Add Address Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add address",
    });
  }
};
/**
 * @desc    Get user's addresses
 * @route   GET /api/addresses
 * @access  Private
 */
export const getMyAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
    });
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/addresses/:id
 * @access  Private
 */
export const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await address.deleteOne();

    res.status(200).json({
      success: true,
      message: "Address deleted",
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
    });
  }
};


