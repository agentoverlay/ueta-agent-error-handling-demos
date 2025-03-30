export class RandomOrderErrorClassifier {
    // Probability of detecting an erroneous order.
    public probability: number = 0.1;

    constructor(public threshold: number) {
        this.probability = threshold;
    }

    public infer(transaction: any): boolean {
        console.log(transaction);
        return Math.random() < this.probability;
    }
}
