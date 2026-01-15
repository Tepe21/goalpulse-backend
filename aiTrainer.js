import * as tf from "@tensorflow/tfjs-node";
import redis from "./redis.js";

async function trainModel() {
  console.log("Training AI model...");

  const data = await redis.get("ai_dataset");
  if (!data) {
    console.log("No dataset found");
    return;
  }

  const dataset = JSON.parse(data);

  const xs = dataset.map(d => [
    d.homeDanger,
    d.awayDanger,
    d.homeShotsOnTarget,
    d.awayShotsOnTarget,
    d.homePossession,
    d.awayPossession,
    d.homeXG,
    d.awayXG
  ]);

  const ys = dataset.map(d => [d.goalAfter60]);

  const X = tf.tensor2d(xs);
  const Y = tf.tensor2d(ys);

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 16, activation: "relu", inputShape: [8] }));
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"]
  });

  await model.fit(X, Y, {
    epochs: 40,
    batchSize: 32,
    shuffle: true
  });

  const modelJson = await model.toJSON();
  await redis.set("ai_model", JSON.stringify(modelJson));

  console.log("AI model trained and stored");
}

trainModel();
