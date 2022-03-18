
import tensorflow as tf
import tensorflow_hub as hub
from app import db, Picture

module = hub.load("https://tfhub.dev/google/movenet/singlepose/thunder/4")
input_size = 256


def movenet(input_image):
    """Runs detection on an input image.

    Args:
        input_image: A [1, height, width, 3] tensor represents the input image
        pixels. Note that the height/width should already be resized and match the
        expected input resolution of the model before passing into this function.

    Returns:
        A [1, 1, 17, 3] float numpy array representing the predicted keypoint
        coordinates and scores.
    """
    model = module.signatures['serving_default']

    # SavedModel format expects tensor type of int32.
    input_image = tf.cast(input_image, dtype=tf.int32)
    # Run model inference.
    outputs = model(input_image)
    # Output is a [1, 1, 17, 3] tensor.
    keypoints_with_scores = outputs['output_0'].numpy()
    return keypoints_with_scores


# Load the input image.
image_file = '22.jpg'
image = tf.io.read_file(f'./assets/{image_file}')
image = tf.image.decode_jpeg(image)

# Resize and pad the image to keep the aspect ratio and fit the expected size.
input_image = tf.expand_dims(image, axis=0)
input_image = tf.image.resize_with_pad(input_image, input_size, input_size)

# Run model inference.
keypoints = movenet(input_image)

# ndarray in json
keypoints_list = keypoints.tolist()

# index: {y:   , x:   , score:   , name:   }
part_list = ["nose", "left_eye", "right_eye", "left_ear", "right_ear", "left_shoulder", "right_shoulder", "left_elbow",
             "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]

keypoints_collection = [{"y": y, "x": x, "score": score, "name": part_list[idx]}
                        for idx, (y, x, score) in enumerate(keypoints_list[0][0])]

new_picture = Picture(
    path=f'../assets/{image_file}', data=keypoints_collection)

db.session.add(new_picture)
db.session.commit()
